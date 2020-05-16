const canvas = document.getElementsByTagName('canvas')[0];
const ctx = canvas.getContext('2d');
const scene = document.getElementsByClassName('scene')[0];
let windowWidth = scene.clientWidth;
let windowHeight = scene.clientHeight;

document.getElementById('solve_button').addEventListener('click', SolveMDP);
document.getElementById('reset_button').addEventListener('click', ResetMDP);
document.getElementById('save_button').addEventListener('click', SaveMDPToJSON);

window.onload = Spin;

function CreateProtagonistElement() {
  let el = document.createElement('div');
  el.classList.add('car');
  el.classList.add('red');
  return el;
}

//
let num_cells_in_row = 10;
let map_interpolator = null;
let renderer = null;
let actor = null;
let mdp_context = null;
let gTextConsole = new TextConsole('text_console', max_num_lines = 5);

ResetMDP();

function RestoreMDPFromJSON(str) {
  if (renderer) {
    renderer.Clear();
  }
  mdp_context = MDPContext.CreateFromJSON(str);
  UpdateNumCells(mdp_context.num_cells);
  ResetHelperClasses(mdp_context);
}

function ResetHelperClasses(mdp_context) {
  map_interpolator =
      new MapInterpolator(mdp_context.window_size, mdp_context.num_cells);
  renderer = new Renderer(scene, mdp_context.num_cells, mdp_context.cell_size,
                          mdp_context.num_actions);
  // Actor must be added to the scene after everything else has been added!
  actor =
      new Actor(CreateProtagonistElement(), windowWidth / 2, windowHeight / 2);
  scene.appendChild(actor.el);
}

function ResetMDP() {
  console.log("ResetMDP");
  mdp_context = new MDPContext(/*window_size=*/ windowWidth,
                               /*num_cells=*/ num_cells_in_row,
                               /*num_actions=*/ kNumActions);
  ResetHelperClasses(mdp_context);

  if (gTextConsole) {
    gTextConsole.Update("Resetting MDP.");
  }
}

document.getElementById('show_action_probability_checkbox')
    .addEventListener('change', function() {
      if (this.checked) {
        renderer.LoadActionProbabilities();
      } else {
        renderer.ClearActionProbabilities();
      }
    });

function UpdateGamma(value) {
  document.getElementById('gamma_range_control_label').innerHTML =
      'gamma: ' + Number(value).toFixed(3, 3);
  mdp_context.gamma = Number(value);
}

function UpdateNumCells(value) {
  document.getElementById('num_cells_range_control_label').innerHTML =
      '# cells: ' + Number(value);
  num_cells_in_row = Number(value);
}

document.getElementById('gamma_range_control')
    .addEventListener('input', function() { UpdateGamma(this.value); });
document.getElementById('gamma_range_control')
    .addEventListener('change', function() { UpdateGamma(this.value); });
document.getElementById('gamma_range_control').value = 0.99;
UpdateGamma(document.getElementById('gamma_range_control').value);

document.getElementById('num_cells_range_control')
    .addEventListener('input', function() { UpdateNumCells(this.value); });
document.getElementById('num_cells_range_control')
    .addEventListener('change', function() {
      UpdateNumCells(this.value);
      ResetMDP();
    });
document.getElementById('num_cells_range_control').value = 10;
UpdateNumCells(document.getElementById('num_cells_range_control').value);

function MouseoverCallback(e) {
  const kOffsetLeft = document.getElementById('scene_container').offsetLeft;
  const kOffsetTop = document.getElementById('scene_container').offsetTop;
  let x = e.clientX - kOffsetLeft;
  let y = e.clientY - kOffsetTop;
  let cell_index = map_interpolator.GetCellIndexAt(x, y);
  if (cell_index != null) {
    renderer.SetHighlightedCellIndex(cell_index);
    if (e.buttons) {
      MousedownCallback(e);
    }
  } else {
    renderer.SetHighlightedCellIndex(-1);
  }
}

function MousedownCallback(e) {
  const kRewardStep = 5;
  const kOffsetLeft = document.getElementById('scene_container').offsetLeft;
  const kOffsetTop = document.getElementById('scene_container').offsetTop;
  let x = e.clientX - kOffsetLeft;
  let y = e.clientY - kOffsetTop;
  mdp_context.UpdateReward(x, y);
}

function MouseDoubleclickCallback(e) {
  const kOffsetLeft = document.getElementById('scene_container').offsetLeft;
  const kOffsetTop = document.getElementById('scene_container').offsetTop;
  let x = e.clientX - kOffsetLeft;
  let y = e.clientY - kOffsetTop;
  mdp_context.UpdateGoalLocation(x, y);
}

function SolveMDP() {
  console.log("SolveMDP");
  actor.speed = 0.0;
  let solver = new MDPSolver(mdp_context.reward_map, gamma = mdp_context.gamma);
  // A heuristic.
  solver.max_num_iterations =
      num_cells_in_row * num_cells_in_row * num_cells_in_row;
  solver.SetIterationCallback(function(s) {
    if (s.current_iteration % 10 == 5) {
      msg = 'On iteration {0}. Per-element difference in the value map: {1}'
                .format(s.current_iteration, s.diff_per_element.toFixed(4, 4));
      mdp_context.policy_map = s.policy_map;
      gTextConsole.Update(msg);
    }
  });
  solver.SetTerminationCallback(function(s) {
    msg =
        'Finished solving the MDP. Current iteration is {0}/{1}, and diff-per-element is: {2}'
            .format(s.current_iteration, s.max_num_iterations,
                    s.diff_per_element.toFixed(4, 4));
    gTextConsole.Update(msg);
    mdp_context.policy_map = s.policy_map;
    actor.speed = 0.5;
  });
  solver.SolveAsyncWithInterval(interval = 0.01);
}

function LoadMDPFromFile() {
  let input = document.getElementById('load_mdp_input');
  if (!input.files) {
    console.log("No support for file loading.");
    return;
  }
  if (!input.files[0]) {
    console.log("No files selected.");
    return;
  }
  var data = '';
  let file = input.files[0];
  gTextConsole.Update("Trying to load a MDP from '" + file.name + "'");

  let file_reader = new FileReader();
  file_reader.onload = ReceivedText;
  file_reader.readAsText(file);

  function ReceivedText(e) { RestoreMDPFromJSON(e.target.result); }
}

function SaveMDPToJSON() {
  console.log("SaveMDPToJSON");
  gTextConsole.Update("Trying to save a MDP...");

  const contents = mdp_context.ToJSON();

  var a = document.createElement('a');
  a.setAttribute('href', 'data:text/plain;charset=utf-u,' +
                             encodeURIComponent(contents));
  a.setAttribute('download', "mdp.json");
  a.click();
}

window.addEventListener('mousemove', MouseoverCallback);
window.addEventListener('mousedown', MousedownCallback);
window.addEventListener('dblclick', MouseDoubleclickCallback);

function render(ms) {
  setTimeout(() => { requestAnimationFrame(render); }, 32);

  // The reward map basically never changes, so we technically do not need to
  // redraw it over and over again.
  renderer.RenderRewardOnly(mdp_context.reward_map);
  renderer.RenderGoal(mdp_context.goal_x, mdp_context.goal_y);
  // If we draw this, then we also need to un-highlighted previously highlighted
  // cells.
  renderer.RenderHighlightedCell();

  // This only needs to be drawn while the MDP is being solved (after it's
  // solved, these remain constant...)
  renderer.RenderActionProbabilities(mdp_context.policy_map);

  // Always need to be drawn.
  renderer.RenderProtagonist(actor);
}

function UpdateAgentState() {
  actor.ChooseAction(map_interpolator, mdp_context.policy_map);
  actor.Update();

  // Render several samples of agent's future trajectory.
  for (let i = 0; i < renderer.num_trajectories; ++i) {
    let trajectory =
        SampleActorTrajectory(actor, map_interpolator, mdp_context.policy_map,
                              /*num_steps=*/ renderer.trajectory_length);
    renderer.RenderOneTrajectory(trajectory, /*index=*/ i);
  }
}

function Spin() {
  setInterval(() => { UpdateAgentState(); }, 10);
  requestAnimationFrame(render);
}
