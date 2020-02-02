const canvas = document.getElementsByTagName('canvas')[0];
const ctx = canvas.getContext('2d');
const scene = document.getElementsByClassName('scene')[0];
let windowWidth = scene.clientWidth;
let windowHeight = scene.clientHeight;

document.getElementById('solve_button').addEventListener('click', SolveMDP);
document.getElementById('reset_button').addEventListener('click', ResetMDP);
document.getElementById('save_button').addEventListener('click', SaveMDPToJSON);

function CreateProtagonistElement() {
  let el = document.createElement('div');
  el.classList.add('car');
  el.classList.add('red');
  return el;
}

//
let kNumCellsInRow = 10;
let kCellSize = windowWidth / kNumCellsInRow;

let gMdpContext = new MDPContext(window_size = 500, num_cells = kNumCellsInRow,
                                 num_actions = kNumActions);

// These are actually "supporting" classes.
let gMapInterpolator =
    new MapInterpolator(window_size = 500, num_cells = kNumCellsInRow);
let gRenderer = new Renderer(scene, kNumCellsInRow, kCellSize, kNumActions);

let gActor = new Actor(CreateProtagonistElement(), x = windowWidth / 2,
                       y = windowHeight / 2);
scene.appendChild(gActor.el);

function RestoreMDPFromJSON(str) {
  if (gRenderer) {
    gRenderer.Clear();
  }
  gMdpContext = MDPContext.CreateFromJSON(str);
  gMapInterpolator = new MapInterpolator(window_size = gMdpContext.window_size,
                                         num_cells = gMdpContext.num_cells);
  gRenderer = new Renderer(scene, num_cells = gMdpContext.num_cells,
                           cell_size = gMdpContext.cell_size,
                           num_actions = gMdpContext.num_actions);
  // Protagonist must be added to the scene after everything else has been
  // added!
  gActor = new Actor(CreateProtagonistElement(), x = windowWidth / 2,
                     y = windowHeight / 2);
  scene.appendChild(gActor.el);
}

function ResetMDP() {
  console.log("ResetMDP");
  gMdpContext.ResetMDP();
  if (gTextConsole) {
    gTextConsole.Update("Resetting MDP.");
  }
}

gTextConsole = new TextConsole('text_console', max_num_lines = 5);

ResetMDP();

document.getElementById('show_action_probability_checkbox')
    .addEventListener('change', function() {
      if (this.checked) {
        gRenderer.LoadActionProbabilities();
      } else {
        gRenderer.ClearActionProbabilities();
      }
    });

function UpdateGamma(value) {
  document.getElementById('gamma_range_control_label').innerHTML =
      'gamma: ' + Number(value).toFixed(3, 3);
  gMdpContext.gamma = Number(value);
}

document.getElementById('gamma_range_control')
    .addEventListener('input', function() { UpdateGamma(this.value); });

document.getElementById('gamma_range_control')
    .addEventListener('change', function() { UpdateGamma(this.value); });

document.getElementById('gamma_range_control').value = 0.99;
UpdateGamma(document.getElementById('gamma_range_control').value);

function MouseoverCallback(e) {
  const kOffsetLeft = document.getElementById('scene_container').offsetLeft;
  const kOffsetTop = document.getElementById('scene_container').offsetTop;
  let x = e.clientX - kOffsetLeft;
  let y = e.clientY - kOffsetTop;
  let cell_index = gMapInterpolator.GetCellIndexAt(x, y);
  if (cell_index != null) {
    gRenderer.SetHighlightedCellIndex(cell_index);
    if (e.buttons) {
      MousedownCallback(e);
    }
  } else {
    gRenderer.SetHighlightedCellIndex(-1);
  }
}

function MousedownCallback(e) {
  const kRewardStep = 5;
  const kOffsetLeft = document.getElementById('scene_container').offsetLeft;
  const kOffsetTop = document.getElementById('scene_container').offsetTop;
  let x = e.clientX - kOffsetLeft;
  let y = e.clientY - kOffsetTop;
  gMdpContext.UpdateReward(x, y);
}

function MouseDoubleclickCallback(e) {
  const kOffsetLeft = document.getElementById('scene_container').offsetLeft;
  const kOffsetTop = document.getElementById('scene_container').offsetTop;
  let x = e.clientX - kOffsetLeft;
  let y = e.clientY - kOffsetTop;
  gMdpContext.UpdateGoalLocation(x, y);
}

function SolveMDP() {
  console.log("SolveMDP");
  gActor.speed = 0.0;
  let solver = new MDPSolver(gMdpContext.reward_map, gamma = gMdpContext.gamma);
  solver.SetIterationCallback(function(s) {
    if (s.current_iteration % 10 == 5) {
      msg = 'Per-element difference in the value map: {0}'.format(
          s.diff_per_element.toFixed(4, 4));
      gMdpContext.policy_map = s.policy_map;
      gTextConsole.Update(msg);
    }
  });
  solver.SetTerminationCallback(function(s) {
    msg = 'Finished solving the MDP!';
    gTextConsole.Update(msg);
    gMdpContext.policy_map = s.policy_map;
    gActor.speed = 2.5;
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

  const contents = gMdpContext.ToJSON();

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
  gRenderer.RenderRewardMap(gMdpContext.reward_map, gMdpContext.goal_x,
                            gMdpContext.goal_y);
  // If we draw this, then we also need to un-highlighted previously highlighted
  // cells.
  gRenderer.RenderHighlightedCell();

  // This only needs to be drawn while the MDP is being solved (after it's
  // solved, these remain constant...)
  gRenderer.RenderActionProbabilities(gMdpContext.policy_map);

  // Always need to be drawn.
  gRenderer.RenderProtagonist(gActor);
}

requestAnimationFrame(render);

function UpdateAgentState() {
  // Choose best action.
  let x = gActor.x;
  let y = gActor.y;

  // Here we should actually sample from the distribution.
  let actions_probs =
      gMapInterpolator.GetInterpolatedValue3D(gMdpContext.policy_map, x, y)
          .tolist();
  let sample_idx = SampleFromDistribution(actions_probs);
  let u = DecodeAction(sample_idx);

  // Update car state.
  gActor.SetAction(ux = u[0], uy = u[1]);
  gActor.Update();
}

setInterval(() => { UpdateAgentState(); }, 10);
