const canvas = document.getElementsByTagName('canvas')[0];
const ctx = canvas.getContext('2d');
const scene = document.getElementsByClassName('scene')[0];
let windowWidth = scene.clientWidth;
let windowHeight = scene.clientHeight;

document.getElementById('solve_button').addEventListener('click', SolveMDP);
document.getElementById('reset_button').addEventListener('click', ResetMDP);

const gCar = {
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

let gRewardMap = null;
let gPolicyMap = null;
let gMapContext = new MapContext(window_size = 500, num_cells = kNumCellsInRow);
let kVelocity = 0;
let kMaxReward = 0;

const kOffsetLeft = document.getElementsByClassName('col')[0].offsetLeft;
const kOffsetTop = document.getElementsByClassName('col')[0].offsetTop;

function ResetMDP() {
  console.log("ResetMDP");
  gRewardMap = nj.zeros([
                   gMapContext.num_cells_in_row, gMapContext.num_cells_in_row
                 ]).add(-1.0);
  gPolicyMap = nj.ones([
                   gMapContext.num_cells_in_row, gMapContext.num_cells_in_row,
                   kNumActions
                 ]).multiply(1.0 / kNumActions);
  kVelocity = 0.0;
  if (gTextConsole) {
    gTextConsole.Update("Resetting MDP.");
  }
}

gTextConsole = new TextConsole('text_console', max_num_lines = 5);

gGamma = 0.99;
ResetMDP();

const cells = [];
for (let i = 0; i < gMapContext.num_cells_in_row; ++i) {
  for (let j = 0; j < gMapContext.num_cells_in_row; ++j) {
    const el = document.createElement('div');
    el.classList.add('cell');
    scene.insertBefore(el, gCar.el);
    cell = {
      x : j * gMapContext.cell_size,
      y : i * gMapContext.cell_size,
      el : el
    };
    cells.push(cell);
  }
}

let action_probabilities = GetActionProbabilities();

document.getElementById('show_action_probability_checkbox')
    .addEventListener('change', function() {
      if (this.checked) {
        action_probabilities = GetActionProbabilities();
      } else {
        ClearActionProbabilities();
      }
    });

function UpdateGamma(value) {
    document.getElementById('gamma_range_control_label').innerHTML =
        'gamma: ' + Number(value).toFixed(3, 3);
    gGamma = Number(value);
}

document.getElementById('gamma_range_control')
    .addEventListener('input', function() {
    UpdateGamma(this.value);
    });

document.getElementById('gamma_range_control')
    .addEventListener('change', function() {
    UpdateGamma(this.value);
    });

UpdateGamma(document.getElementById('gamma_range_control').value);

function ClearActionProbabilities() {
    for (let i = 0; i < action_probabilities.length; ++i) {
      for (let u = 0; u < action_probabilities[i].length; ++u) {
        let el = action_probabilities[i][u].el;
        el.parentNode.removeChild(el);
      }
    }
    action_probabilities = [];
}

function GetActionProbabilities() {
    let action_probabilities = [];
    for (let i = 0; i < gMapContext.num_cells_in_row; ++i) {
      for (let j = 0; j < gMapContext.num_cells_in_row; ++j) {
        let line_group = [];
        for (let k = 0; k < kNumActions; ++k) {
          const u = DecodeAction(k);
          const theta = Math.atan2(u[1], u[0]);

          const el = document.createElement('div');
          el.classList.add('line');
          scene.insertBefore(el, gCar.el);
          line = {
            x : j * gMapContext.cell_size,
            y : i * gMapContext.cell_size,
            theta : theta,
            el : el
          };
          const length = gMapContext.cell_size / 2.0 - 2;
          const x = line.x + 0.5 * gMapContext.cell_size - 0.5 * length;
          const y = line.y + 0.5 * gMapContext.cell_size;
          line.el.style.backgroundColor = `rgb(${255.0 * k / 9.0}, 0, 0)`;
          line.el.style.transform = `translate(${x}px, ${y}px) rotate(${
              theta * 180.0 / Math.PI +
              180.0}deg) translate(${- length / 2}px, 0px)`;

          if (Math.abs(u[0]) > 0 || Math.abs(u[1]) > 0) {
            line.el.style.width = `${length}px`;
          } else {
            line.el.style.width = '1px';
          }
          line_group.push(line);
        }
        action_probabilities.push(line_group);
      }
    }
    return action_probabilities;
}

function GetCellIndexAt(x, y) {
    let x_idx = parseInt(x / kCellSize);
    let y_idx = parseInt(y / kCellSize);
    if (x_idx >= 0 && x_idx < kNumCellsInRow && y_idx >= 0 &&
        y_idx < kNumCellsInRow) {
      return y_idx * kNumCellsInRow + x_idx;
    } else {
      return null;
    }
}

let gHighlightedCell = -1;

function MouseoverCallback(e) {
    let x = e.clientX - kOffsetLeft;
    let y = e.clientY - kOffsetTop;
    let cell_index = gMapContext.GetCellIndexAt(x, y);
    if (cell_index != null) {
      gHighlightedCell = cell_index;
      if (e.buttons) {
        MousedownCallback(e);
      }
    } else {
      gHighlightedCell = -1;
    }
}

function MousedownCallback(e) {
    let x = e.clientX - kOffsetLeft;
    let y = e.clientY - kOffsetTop;
    let x_idx = parseInt(x / kCellSize);
    let y_idx = parseInt(y / kCellSize);
    if (x_idx >= 0 && x_idx < kNumCellsInRow && y_idx >= 0 &&
        y_idx < kNumCellsInRow) {
      gRewardMap.set(y_idx, x_idx, gRewardMap.get(y_idx, x_idx) - 1);
    }
}

let gGoalXY = [ 0, 0 ];
gRewardMap.set(0, 0, kMaxReward);

function MouseDoubleclickCallback(e) {
    let x = e.clientX - kOffsetLeft;
    let y = e.clientY - kOffsetTop;
    let x_idx = parseInt(x / kCellSize);
    let y_idx = parseInt(y / kCellSize);
    gRewardMap.set(gGoalXY[1], gGoalXY[0], -1.0);
    if (x_idx >= 0 && x_idx < kNumCellsInRow && y_idx >= 0 &&
        y_idx < kNumCellsInRow) {
      gRewardMap.set(y_idx, x_idx, kMaxReward);
      gGoalXY = [ x_idx, y_idx ];
    }
}

function SolveMDP() {
    console.log("SolveMDP");
    let solver = new MDPSolver(gRewardMap, gamma = gGamma);
    solver.SetIterationCallback(function(s) {
      msg = 'Per-element difference in the value map: {0}'.format(
          s.diff_per_element.toFixed(4, 4));
      gPolicyMap = s.policy_map;
      gTextConsole.Update(msg);
    });
    solver.SetTerminationCallback(function(s) {
      msg = 'Finished solving the MDP!';
      gTextConsole.Update(msg);
      gPolicyMap = s.policy_map;
      kVelocity = 2.5;
    });

    solver.SolveAsyncWithInterval(interval = 0.01);
}

const keysDown = {};

window.addEventListener('keydown', e => {
    keysDown[e.which] = true; });

window.addEventListener('keyup', e => {
    keysDown[e.which] = false; });

window.addEventListener('mousemove', MouseoverCallback);
window.addEventListener('mousedown', MousedownCallback);
window.addEventListener('dblclick', MouseDoubleclickCallback);

function RenderGridCell(cell, rgb, transform = false) {
    const {x, y} = cell;
    if (transform) {
      let x1 = x;
      let x2 = x + kCellSize;
      let y1 = y;
      let y2 = y + kCellSize;
      cell.el.style.transform = `translate(${x}px, ${y}px)`;
    }
    color = "rgb({0},{1},{2})".format(rgb[0], rgb[1], rgb[2]);
    cell.el.style.backgroundColor = color;
}
function RenderActionProbability(line, action_prob) {
    line.el.style.backgroundColor = `rgb(${action_prob * 255.0}, 0, 0)`;
}

function RenderGrid(transform = false) {
    let i = 0;
    for (let r = 0; r < gRewardMap.shape[0]; ++r) {
      for (let c = 0; c < gRewardMap.shape[1]; ++c, ++i) {
        rgb = [ 100, 100, 100 ];

        rgb[0] += 10 * gRewardMap.get(r, c);
        rgb[1] += 10 * gRewardMap.get(r, c);
        rgb[2] += 10 * gRewardMap.get(r, c);

        if (i == gHighlightedCell) {
          rgb[0] += 50;
        }
        if (r == gGoalXY[1] && c == gGoalXY[0]) {
          rgb = [ 0, 200, 0 ];
        }
        RenderGridCell(cells[i], rgb, transform);
      }
    }
}

function RenderActionProbabilities() {
    let i = 0;
    for (let r = 0; r < gRewardMap.shape[0]; ++r) {
      for (let c = 0; c < gRewardMap.shape[1]; ++c, ++i) {
        if (action_probabilities.length <= i) {
          return;
        }
        for (let u = 0; u < kNumActions; ++u) {
          RenderActionProbability(action_probabilities[i][u],
                                  gPolicyMap.get(r, c, u));
        }
      }
    }
}

function RenderCar(car) {
    const {x, y, ux, uy} = car;
    let theta = Math.atan2(uy, ux) + Math.PI / 2.0;
    car.el.style.transform =
        `translate(${x}px, ${y}px) rotate(${theta * 180 / Math.PI}deg)`;
}

let gIsFirstTime = true;
function render(ms) {
    setTimeout(() => { requestAnimationFrame(render); }, 32);
    RenderGrid(gIsFirstTime);
    RenderActionProbabilities();

    RenderCar(gCar);
    gIsFirstTime = false;
}

requestAnimationFrame(render);

function UpdateAgentState() {
    // Choose best action.
    let x = gCar.x;
    let y = gCar.y;

    // Here we should actually sample from the distribution.
    let actions_probs =
        gMapContext.GetInterpolatedValue3D(gPolicyMap, x, y).tolist();
    let sample_idx = SampleFromDistribution(actions_probs);
    let u = DecodeAction(sample_idx);
    // Update car state.
    gCar.x += u[0] * kVelocity;
    gCar.y += u[1] * kVelocity;
    gCar.ux = u[0];
    gCar.uy = u[1];
    // console.log(x);
    // console.log(y);
}

setInterval(() => {
    UpdateAgentState();

    if (kVelocity > 0) {
      let x = gCar.x;
      let y = gCar.y;
      let reward = gMapContext.GetInterpolatedValue2D(gRewardMap, x, y);
      msg = 'at (x={0}, y={1}), reward={2}'.format(x, y, reward);
      gTextConsole.Update(msg);
    }
}, 10);
