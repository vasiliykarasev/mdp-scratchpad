const canvas = document.getElementsByTagName('canvas')[0];
const ctx = canvas.getContext('2d');
const scene = document.getElementsByClassName('scene')[0];
let windowWidth = scene.clientWidth;
let windowHeight = scene.clientHeight;

let img = document.getElementById('img');
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
ResetMDP();

function ResetMDP() {
  console.log("ResetMDP");
  gRewardMap = nj.zeros([
                   gMapContext.num_cells_in_row, gMapContext.num_cells_in_row
                 ]).add(-1.0);
  gPolicyMap = nj.ones([
                   gMapContext.num_cells_in_row, gMapContext.num_cells_in_row,
                   kNumActions
                 ]).multiply(1.0 / kNumActions);
}

let kVelocity = 0;
let kMaxReward = 0;

gTextConsole = new TextConsole('text_console', max_num_lines = 5);

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

// function GetCellAt(x, y) {
//  let x_idx = x / gMapContext.cell_size;
//  let y_idx = y / gMapContext.cell_size;
//  if (x_idx >= 0 && x_idx < gMapContext.num_cells_in_row && y_idx >= 0 &&
//      y_idx < gMapContext.num_cells_in_row) {
//    return cells[y_idx * gMapContext.num_cells_in_row + x_idx];
//  } else {
//    return null;
//  }
//}

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
  let x = e.clientX - scene.offsetLeft;
  let y = e.clientY - scene.offsetTop;
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
  let x = e.clientX - scene.offsetLeft;
  let y = e.clientY - scene.offsetTop;
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
  let x = e.clientX - scene.offsetLeft;
  let y = e.clientY - scene.offsetTop;
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
  let solver = new MDPSolver(gRewardMap, gamma = 0.995);
  solver.SetIterationCallback(function(s) {
    msg = 'Per-element difference in the value map: {0}'.format(
        s.diff_per_element.toFixed(4, 4));
    gTextConsole.Update(msg);
  });
  solver.SetTerminationCallback(function(s) {
    msg = 'Finished solving the MDP!';
    gTextConsole.Update(msg);
    gPolicyMap = s.policy_map;
    kVelocity = 5.0;
  });

  solver.SolveAsyncWithInterval(interval = 1);
}

const keysDown = {};

window.addEventListener('keydown', e => { keysDown[e.which] = true; });

window.addEventListener('keyup', e => { keysDown[e.which] = false; });

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
  RenderCar(gCar);
  gIsFirstTime = false;
}

requestAnimationFrame(render);

//function GetRewardAt(reward_map, x, y) {
//  let funcs = [ Math.floor, Math.ceil ];
//  let reward_sum = 0.0;
//  for (let i = 0; i < 2; ++i) {
//    for (let j = 0; j < 2; ++j) {
//      let x_idx =
//          Math.min(Math.max(0, funcs[i](x / kCellSize)), kNumCellsInRow - 1);
//      let y_idx =
//          Math.min(Math.max(0, funcs[j](y / kCellSize)), kNumCellsInRow - 1);
//      let wx = 1.0 - Math.abs(x - kCellSize * x_idx) / kCellSize;
//      let wy = 1.0 - Math.abs(y - kCellSize * y_idx) / kCellSize;
//      reward_sum += reward_map.get(y_idx, x_idx);
//    }
//  }
//  return reward_sum / 4;
//}

//function GetPolicyAt(policy_map, x, y) {
//  let actions_probs = nj.zeros([ kNumActions ]);
//  let funcs = [ Math.floor, Math.ceil ];
//  let weight_sum = 1e-6;
//  for (let i = 0; i < 2; ++i) {
//    for (let j = 0; j < 2; ++j) {
//      let x_idx =
//          Math.min(Math.max(0, funcs[i](x / kCellSize)), kNumCellsInRow - 1);
//      let y_idx =
//          Math.min(Math.max(0, funcs[j](y / kCellSize)), kNumCellsInRow - 1);
//      let wx = 1.0 - Math.abs(x - kCellSize * x_idx) / kCellSize;
//      let wy = 1.0 - Math.abs(y - kCellSize * y_idx) / kCellSize;
//      weight_sum += wx * wy;
//      for (let i = 0; i < policy_map.shape[2]; ++i) {
//        let pi = policy_map.get(y_idx, x_idx, i);
//        actions_probs.set(i, actions_probs.get(i) + wx * wy * pi);
//      }
//    }
//  }
//  actions_probs = actions_probs.multiply(1.0 / weight_sum);
//  return actions_probs;
//}

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
}, 100);
