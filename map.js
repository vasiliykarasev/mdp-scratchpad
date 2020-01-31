const canvas = document.getElementsByTagName('canvas')[0];
const ctx = canvas.getContext('2d');
const scene = document.getElementsByClassName('scene')[0];
let windowWidth = scene.clientWidth;
let windowHeight = scene.clientHeight;

document.getElementById('solve_button').addEventListener('click', SolveMDP);
document.getElementById('reset_button').addEventListener('click', ResetMDP);

const gProtagonist = {
  el : document.getElementsByClassName('car')[0],
  // State parameters.
  x : windowWidth / 2,
  y : windowHeight / 2,
  ux : 0,
  uy : 0,
};
//
let kNumCellsInRow = 20;
let kCellSize = windowWidth / kNumCellsInRow;

let gMapContext = new MapContext(window_size = 500, num_cells = kNumCellsInRow);
let gMdpContext = new Context(window_size = 500, num_cells = kNumCellsInRow,
                              num_actions = kNumActions);
let gRenderer = new Renderer(scene, kNumCellsInRow, kCellSize, kNumActions);

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
  let cell_index = gMapContext.GetCellIndexAt(x, y);
  if (cell_index != null) {
    gRenderer.highlighted_cell_index = cell_index;
    if (e.buttons) {
      MousedownCallback(e);
    }
  } else {
    gRenderer.highlighted_cell_index = -1;
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
    gMdpContext.velocity = 2.5;
  });

  solver.SolveAsyncWithInterval(interval = 0.01);
}

window.addEventListener('mousemove', MouseoverCallback);
window.addEventListener('mousedown', MousedownCallback);
window.addEventListener('dblclick', MouseDoubleclickCallback);

function render(ms) {
  setTimeout(() => { requestAnimationFrame(render); }, 32);
  gRenderer.RenderRewardMap(gMdpContext.reward_map, gMdpContext.goal_x,
                            gMdpContext.goal_y);
  gRenderer.RenderActionProbabilities(gMdpContext.policy_map);

  gRenderer.RenderProtagonist(gProtagonist);
}

requestAnimationFrame(render);

function UpdateAgentState() {
  // Choose best action.
  let x = gProtagonist.x;
  let y = gProtagonist.y;

  // Here we should actually sample from the distribution.
  let actions_probs =
      gMapContext.GetInterpolatedValue3D(gMdpContext.policy_map, x, y).tolist();
  let sample_idx = SampleFromDistribution(actions_probs);
  let u = DecodeAction(sample_idx);

  // Update car state.
  gProtagonist.x += u[0] * gMdpContext.velocity;
  gProtagonist.y += u[1] * gMdpContext.velocity;
  gProtagonist.ux = u[0];
  gProtagonist.uy = u[1];
  // console.log(x);
  // console.log(y);
}

setInterval(() => {
  UpdateAgentState();

  if (gMdpContext.velocity > 0) {
    let x = gProtagonist.x;
    let y = gProtagonist.y;
    let reward =
        gMapContext.GetInterpolatedValue2D(gMdpContext.reward_map, x, y);
    msg = 'at (x={0}, y={1}), reward={2}'.format(x, y, reward);
    gTextConsole.Update(msg);
  }
}, 10);
