class Context {
  constructor(window_size, num_cells, num_actions) {
    this.window_size = window_size;
    this.num_cells = num_cells;
    this.num_actions = num_actions;
    this.cell_size = window_size / num_cells;
    this.velocity = 0.0;
    this.max_reward = 0.0;
    this.nominal_reward = -1.0;
    this.reward_step = 5.0;

    this.gamma = 0.9;

    this.goal_x = 0;
    this.goal_y = 0;

    this.ResetMDP();
  }

  ResetMDP() {
    this.reward_map =
        nj.zeros([ this.num_cells, this.num_cells ]).add(this.nominal_reward);
    this.reward_map.set(this.goal_y, this.goal_x, this.max_reward);
    this.policy_map = nj.ones([
                          this.num_cells, this.num_cells, this.num_actions
                        ]).multiply(1.0 / this.num_actions);
    this.velocity = 0.0;
  }

  UpdateReward(x, y) {
    let x_idx = parseInt(x / this.cell_size);
    let y_idx = parseInt(y / this.cell_size);
    if (x_idx >= 0 && x_idx < this.num_cells && y_idx >= 0 &&
        y_idx < this.num_cells) {
      this.reward_map.set(y_idx, x_idx,
                          this.reward_map.get(y_idx, x_idx) - this.reward_step);
    }
  }

  UpdateGoalLocation(x, y) {
    let x_idx = parseInt(x / this.cell_size);
    let y_idx = parseInt(y / this.cell_size);
    this.reward_map.set(this.goal_y, this.goal_x, this.nominal_reward);
    if (x_idx >= 0 && x_idx < this.num_cells && y_idx >= 0 &&
        y_idx < this.num_cells) {
      this.reward_map.set(y_idx, x_idx, this.max_reward);
      this.goal_x = x_idx;
      this.goal_y = y_idx;
    }
  }
};

class Renderer {
  constructor(scene, num_cells_in_row, cell_size, num_actions) {
    this.scene = scene;
    this.num_cells_in_row = num_cells_in_row;
    this.cell_size = cell_size;
    this.num_actions = num_actions;
    this.highlighted_cell_index = -1;

    // Create a set of cells for the reward map.
    this.cells = Renderer.CreateRewardMapCellArray(this.num_cells_in_row,
                                                   this.cell_size);
    // this is a hack!
    let car = document.getElementsByClassName('car')[0];
    for (let i = 0; i < this.cells.length; ++i) {
      this.scene.insertBefore(this.cells[i].el, car);
    }
    // Load action probabilities.
    this.LoadActionProbabilities();
  }

  // Creates an array of cells used for visualizing the reward map.
  static CreateRewardMapCellArray(num_cells_in_row, cell_size) {
    const cells = [];
    for (let i = 0; i < num_cells_in_row; ++i) {
      for (let j = 0; j < num_cells_in_row; ++j) {
        const el = document.createElement('div');
        el.classList.add('cell');
        let cell = {x : j * cell_size, y : i * cell_size, el : el};
        cell.el.style.transform = `translate(${cell.x}px, ${cell.y}px)`;
        cells.push(cell);
      }
    }
    return cells;
  }

  LoadActionProbabilities() {
    this.action_probabilities = Renderer.CreateActionProbabilitiesArray(
        this.num_cells_in_row, this.cell_size, this.num_actions);
    let car = document.getElementsByClassName('car')[0];
    for (let i = 0; i < this.action_probabilities.length; ++i) {
      for (let u = 0; u < this.action_probabilities[i].length; ++u) {
        this.scene.insertBefore(this.action_probabilities[i][u].el, car);
      }
    }
  }

  ClearActionProbabilities() {
    for (let i = 0; i < this.action_probabilities.length; ++i) {
      for (let u = 0; u < this.action_probabilities[i].length; ++u) {
        let el = this.action_probabilities[i][u].el;
        el.parentNode.removeChild(el);
      }
    }
    this.action_probabilities = [];
  }

  static CreateActionProbabilitiesArray(num_cells_in_row, cell_size,
                                        num_actions) {
    let action_probabilities = [];
    for (let i = 0; i < num_cells_in_row; ++i) {
      for (let j = 0; j < num_cells_in_row; ++j) {
        let line_group = [];
        for (let k = 0; k < num_actions; ++k) {
          const u = DecodeAction(k);
          const theta = Math.atan2(u[1], u[0]);

          const el = document.createElement('div');
          el.classList.add('line');
          // scene.insertBefore(el, gCar.el);
          let line =
              {x : j * cell_size, y : i * cell_size, theta : theta, el : el};
          const length = cell_size / 2.0 - 2;
          const x = line.x + 0.5 * cell_size - 0.5 * length;
          const y = line.y + 0.5 * cell_size;
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

  // Renders the main entity.
  RenderProtagonist(protagonist) {
    const {x, y, ux, uy} = protagonist;
    let theta = Math.atan2(uy, ux) + Math.PI / 2.0;
    protagonist.el.style.transform =
        `translate(${x}px, ${y}px) rotate(${theta * 180 / Math.PI}deg)`;
  }

  RenderRewardMap(reward_map, goal_x, goal_y) {
    let i = 0;
    for (let r = 0; r < reward_map.shape[0]; ++r) {
      for (let c = 0; c < reward_map.shape[1]; ++c, ++i) {
        let rgb = [ 100, 100, 100 ];

        rgb[0] += 10 * reward_map.get(r, c);
        rgb[1] += 10 * reward_map.get(r, c);
        rgb[2] += 10 * reward_map.get(r, c);

        if (i == this.highlighted_cell_index) {
          rgb[0] += 50;
        }
        if (r == goal_y && c == goal_x) {
          rgb = [ 0, 200, 0 ];
        }
        this.RenderGridCell(this.cells[i], rgb);
      }
    }
  }

  RenderGridCell(cell, rgb) {
    const {x, y} = cell;
    const color = "rgb({0},{1},{2})".format(rgb[0], rgb[1], rgb[2]);
    cell.el.style.backgroundColor = color;
  }

  RenderActionProbabilities(policy_map) {
    let i = 0;
    for (let r = 0; r < policy_map.shape[0]; ++r) {
      for (let c = 0; c < policy_map.shape[1]; ++c, ++i) {
        if (this.action_probabilities.length <= i) {
          return;
        }
        for (let u = 0; u < policy_map.shape[2]; ++u) {
          this.RenderActionProbability(this.action_probabilities[i][u],
                                       policy_map.get(r, c, u));
        }
      }
    }
  }

  RenderActionProbability(line, action_prob) {
    line.el.style.backgroundColor = `rgb(${action_prob * 255.0}, 0, 0)`;
  }
};
