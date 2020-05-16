class Renderer {
  constructor(scene, num_cells_in_row, cell_size, num_actions,
              num_trajectories=10,
              trajectory_length=20) {
    this.scene = scene;
    this.num_cells_in_row = num_cells_in_row;
    this.cell_size = cell_size;
    this.num_actions = num_actions;
    this.highlighted_cell_index = -1;
    this.previous_highlighted_cell_indices = [];

    this.num_trajectories = num_trajectories;
    this.trajectory_length = trajectory_length;

    for (let i = 0; i < num_cells_in_row * num_cells_in_row; ++i) {
      this.previous_highlighted_cell_indices.push(i);
    }

    // Create a set of cells for the reward map.
    this.cells = Renderer.CreateRewardMapCellArray(this.num_cells_in_row,
                                                   this.cell_size);
    for (let i = 0; i < this.cells.length; ++i) {
      this.scene.appendChild(this.cells[i].el);
    }
    // Load action probabilities.
    this.action_probabilities = [];
    // this.LoadActionProbabilities();
    this.trajectory_collection = [];
    this.LoadTrajectoryCollection();
  }

  Clear() {
    this.ClearActionProbabilities();
    this.ClearTrajectoryCollection();
    while (this.scene.children.length > 0) {
      this.scene.removeChild(this.scene.children[0]);
    }
    let el = document.createElement("canvas");
    scene.appendChild(el);
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

  SetHighlightedCellIndex(i) {
    if (this.highlighted_cell_index >= 0) {
      this.previous_highlighted_cell_indices.push(this.highlighted_cell_index);
    }
    this.highlighted_cell_index = i;
  }

  LoadActionProbabilities() {
    this.ClearActionProbabilities();
    this.action_probabilities = Renderer.CreateActionProbabilitiesArray(
        this.num_cells_in_row, this.cell_size, this.num_actions);
    for (let i = 0; i < this.action_probabilities.length; ++i) {
      this.scene.appendChild(this.action_probabilities[i].el);
    }
  }

  ClearActionProbabilities() {
    if (!this.action_probabilities) {
      return;
    }
    for (let i = 0; i < this.action_probabilities.length; ++i) {
      let el = this.action_probabilities[i].el;
      el.parentNode.removeChild(el);
    }
    this.action_probabilities = [];
  }

  static CreateActionProbabilitiesArray(num_cells_in_row, cell_size,
                                        num_actions) {
    let action_probabilities = [];
    for (let i = 0; i < num_cells_in_row; ++i) {
      for (let j = 0; j < num_cells_in_row; ++j) {
        for (let k = 0; k < num_actions; ++k) {
          const u = DecodeAction(k);
          const theta = Math.atan2(u[1], u[0]);

          const el = CreateLineElement();
          // TODO(vasiliy): split out this garbage into a function that creates
          // a line element.
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
          action_probabilities.push(line);
        }
      }
    }
    return action_probabilities;
  }

  LoadTrajectoryCollection() {
    console.log("Loading trajectory collection.");
    this.ClearTrajectoryCollection();
    this.trajectory_collection = Renderer.CreateTrajectoryCollection(
        this.trajectory_length, this.num_trajectories);
    for (let i = 0; i < this.trajectory_collection.length; ++i) {
      for (let j = 0; j < this.trajectory_collection[i].length; ++j) {
        this.scene.appendChild(this.trajectory_collection[i][j]);
      }
    }
  }

  ClearTrajectoryCollection() {
    if (!this.trajectory_collection) {
      return;
    }
    for (let i = 0; i < this.trajectory_collection.length; ++i) {
      for (let j = 0; j < this.trajectory_collection[i].length; ++j) {
        let el = this.trajectory_collection[i][j];
        el.parentNode.removeChild(el);
      }
    }
    this.trajectory_collection = [];
  }

  // Returns a collection (an array) of trajectories.
  // Each trajectory is simply a collection of short straight lines -- this
  // collection is meant to approximate an arbitrary curved line.
  static CreateTrajectoryCollection(trajectory_length, num_trajectories) {
    let trajectory_bundle = [];
    for (let j = 0; j < num_trajectories; ++j) {
      let trajectory = [];
      for (let k = 0; k < trajectory_length; ++k) {
        let line = CreateLineElement();
        line.style.opacity = 0.25;
        trajectory.push(line);
      }
      trajectory_bundle.push(trajectory);
    }
    return trajectory_bundle;
  }

  RenderOneTrajectory(trajectory_data, index) {
    if (!this.trajectory_collection ||
        index >= this.trajectory_collection.length) {
      return;
    }
    Renderer.RenderTrajectory(trajectory_data,
                              this.trajectory_collection[index]);
  }

  static RenderTrajectory(trajectory_data, trajectory_line_elements) {
    console.assert(trajectory_data.length <= trajectory_line_elements.length);
    if (trajectory_data.length == 0) {
      return;
    }

    for (let i = 1; i < trajectory_data.length; ++i) {
      let x2 = trajectory_data[i].x;
      let y2 = trajectory_data[i].y;
      let x1 = trajectory_data[i - 1].x;
      let y1 = trajectory_data[i - 1].y;
      let el = trajectory_line_elements[i];
      SetLineTransform(el, x1, x2, y1, y2);
      //line.el.style.opacity = '0.25';
    }
    // TODO(vasiliy): handle cases where line_elements.size() !=
    // trajectory_data.size().
  }

  // Renders the main entity.
  RenderProtagonist(protagonist) {
    const {x, y, ux, uy} = protagonist;
    let theta = Math.atan2(uy, ux) + Math.PI / 2.0;
    protagonist.el.style.transform =
        `translate(${x}px, ${y}px) rotate(${theta * 180 / Math.PI}deg)`;
  }

  RenderHighlightedCell() {
    if (this.highlighted_cell_index < 0) {
      return;
    }
    let rgb = [ 100, 100, 100 ];
    rgb[0] += 50;
    this.RenderGridCell(this.cells[this.highlighted_cell_index], rgb);
  }

  RenderRewardOnly(reward_map) {
    let i = 0;
    for (let i = 0; i < this.cells.length; ++i) {
      let value = reward_map.selection.data[i];
      let rgb = [ 100, 100, 100 ];

      rgb[0] += value;
      rgb[1] += value;
      rgb[2] += value;

      this.RenderGridCell(this.cells[i], rgb);
    }
  }

  RenderGoal(goal_x, goal_y) {
    let goal_idx = goal_x + this.num_cells_in_row * goal_y;
    this.RenderGridCell(this.cells[goal_idx], [ 0, 200, 0 ]);
  }

  RenderGridCell(cell, rgb) {
    const {x, y} = cell;
    const color = "rgb({0},{1},{2})".format(rgb[0], rgb[1], rgb[2]);
    cell.el.style.backgroundColor = color;
  }

  RenderActionProbabilities(policy_map) {
    // var t0 = performance.now();
    let i = 0;
    for (let r = 0; r < policy_map.shape[0]; ++r) {
      for (let c = 0; c < policy_map.shape[1]; ++c) {
        for (let u = 0; u < policy_map.shape[2]; ++u, ++i) {
          if (this.action_probabilities.length <= i) {
            return;
          }
          this.RenderActionProbability(this.action_probabilities[i],
                                       policy_map.get(r, c, u));
        }
      }
    }
    // var t1 = performance.now();
    // console.log("Call to doSomething took " + (t1 - t0) + " milliseconds.");
  }

  RenderActionProbability(line, action_prob) {
    line.el.style.backgroundColor = `rgb(${action_prob * 255.0}, 0, 0)`;
  }
};


