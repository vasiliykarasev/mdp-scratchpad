const canvas = document.getElementsByTagName('canvas')[0];
const ctx = canvas.getContext('2d');
const scene = document.getElementsByClassName('scene')[0];
document.getElementById('actor_add').addEventListener('click', AddActor);
document.getElementById('actor_remove').addEventListener('click', RemoveActor);

let mdp_collection = [];
let policy_maps = [];
let reward_map = [];

let map_interpolator = null;
let renderer = null;

let actors = [];

function UpdateEpsilon(value) {
  document.getElementById('epsilon_range_control_label').innerHTML =
      'epsilon: ' + Number(value).toFixed(3, 3);
  for (let i = 0; i < actors.length; ++i) {
    actors[i].goal_switching_probability = value;
  }
}

document.getElementById('epsilon_range_control')
    .addEventListener('input', function() { UpdateEpsilon(this.value); });

document.getElementById('epsilon_range_control')
    .addEventListener('change', function() { UpdateEpsilon(this.value); });

document.getElementById('epsilon_range_control').value = 5e-3;
UpdateEpsilon(document.getElementById('epsilon_range_control').value);

function LoadMDPs() {
  // An unusual storage place, but it will hae to do.
  const kMdpFilenames = [
    'https://newyorksky.live.s3.us-east-1.amazonaws.com/mdp/data/60/mdp_60_6.json',
    'https://newyorksky.live.s3.us-east-1.amazonaws.com/mdp/data/60/mdp_60_7.json',
    'https://newyorksky.live.s3.us-east-1.amazonaws.com/mdp/data/60/mdp_60_8.json',
    'https://newyorksky.live.s3.us-east-1.amazonaws.com/mdp/data/60/mdp_60_9.json',
    'https://newyorksky.live.s3.us-east-1.amazonaws.com/mdp/data/60/mdp_60_10.json',
  ];
  for (let i = 0; i < kMdpFilenames.length; ++i) {
    $.ajax({
      url : kMdpFilenames[i],
      method : "GET",
      success : function(response) {
        mdp_collection.push(MDPContext.CreateFromJSON(response));
        if (mdp_collection.length == kMdpFilenames.length) {
          console.log("Loaded last MDP!");
          const window_size = mdp_collection[0].window_size;
          const num_cells = mdp_collection[0].num_cells;
          const cell_size = mdp_collection[0].cell_size;
          const num_actions = mdp_collection[0].num_actions;

          // It's a little silly to unpack this into additional global
          // variables, but it makes things more convenient down the line.
          for (let i = 0; i < mdp_collection.length; ++i) {
            policy_maps.push(mdp_collection[i].policy_map);
          }
          reward_map = mdp_collection[0].reward_map;

          map_interpolator = new MapInterpolator(window_size, num_cells);
          renderer = new Renderer(scene, num_cells, cell_size, num_actions);
          // Protagonist must be added to the scene after everything else has
          // been added!
          // By default we only add a single actor.
          AddActor();
          // Now that everything has been initialized we can launch the loop.
          Spin();
        }
      }
    });
  }
}

function AddActor() {
  const x = Math.random() * scene.clientWidth;
  const y = Math.random() * scene.clientHeight;
  const rgb = [
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
  ];
  const goal_switching_probability =
      document.getElementById('epsilon_range_control').value;

  const actor = new GoalSwitchingActor(
      CreateActorElement(rgb), x, y,
      /*num_goals=*/policy_maps.length,
      /*goal_switching_probability=*/goal_switching_probability);
  actor.speed = 0.5;
  scene.appendChild(actor.el);
  actors.push(actor);
}

function RemoveActor() {
  if (actors.length == 0) {
    return;
  }
  let actor = actors.pop();
  console.log(actor);
  scene.removeChild(actor.el);
}

window.onload = LoadMDPs;

function CreateActorElement(rgb) {
  let el = document.createElement('div');
  el.classList.add('car');
  el.classList.add('red');
  el.style.border = `solid 2px`;
  el.style.borderColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  return el;
}

gTextConsole = new TextConsole('text_console', max_num_lines = 5);

let reward_map_has_been_drawn_once = false;

function render(ms) {
  setTimeout(() => { requestAnimationFrame(render); }, 32);

  // The reward map basically never changes, so we only need to draw it once.
  // The same is true for 'goals'.
  if (!reward_map_has_been_drawn_once) {
    renderer.RenderRewardOnly(reward_map);
    for (let i = 0; i < mdp_collection.length; ++i) {
      renderer.RenderGoal(goal_x = mdp_collection[i].goal_x,
                          goal_y = mdp_collection[i].goal_y);
    }
    reward_map_has_been_drawn_once = true;
  }
  // Always need to be drawn.
  for (let i = 0; i < actors.length; ++i) {
    renderer.RenderProtagonist(actors[i]);
  }
}

function UpdateActorsStates() {
  for (let i = 0; i < actors.length; ++i) {
    actors[i].ChooseAction(map_interpolator, policy_maps);
    actors[i].Update();
  }
}

function Spin() {
  setInterval(() => { UpdateActorsStates(); }, 10);
  requestAnimationFrame(render);
}
