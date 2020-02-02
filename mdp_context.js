class MDPContext {
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

    this.reward_map = null;
    this.policy_map = null;
    this.goal_x = 0;
    this.goal_y = 0;

    this.ResetMDP();
  }

  // Returns the object as a JSON string.
  ToJSON() { return JSON.stringify(this); }

  // Restores object from JSON.
  static CreateFromJSON(str_or_obj) {
    let obj = typeof(str_or_obj) == "string" ? JSON.parse(str_or_obj) : str_or_obj;
    var output = Object.assign(new MDPContext(1, 1, 1), obj);
    // Now we need to restore numjs arrays.
    output.reward_map = ParseFromJSON2D(output.reward_map);
    output.policy_map = ParseFromJSON3D(output.policy_map);
    return output;
  }

  ResetMDP() {
    if (this.num_cells == 0) {
      return;
    }
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

function ParseFromJSON2D(input_string) {
  const input = JSON.parse(input_string);
  const n = input.length;
  const m = input[0].length;
  let output = nj.zeros([ n, m ]);
  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < m; ++j) {
      output.set(i, j, input[i][j]);
    }
  }
  return output;
}

function ParseFromJSON3D(input_string) {
  const input = JSON.parse(input_string);
  const n = input.length;
  const m = input[0].length;
  const k = input[0][0].length;
  let output = nj.zeros([ n, m, k ]);
  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < m; ++j) {
      for (let u = 0; u < k; ++u) {
        output.set(i, j, u, input[i][j][u]);
      }
    }
  }
  return output;
}
