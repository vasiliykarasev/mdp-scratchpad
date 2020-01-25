// In case we are running under node.
if (typeof window === 'undefined') {
  var nj = require('numjs');
}

let kNumActions = 9;

function DecodeAction(i) {
  console.assert(i >= 0 && i < kNumActions, "Invalid action index: " + i);
  if (i == 0) {
    return [ 0, 1 ];
  } else if (i == 1) {
    return [ 1, 1 ];
  } else if (i == 2) {
    return [ 1, 0 ];
  } else if (i == 3) {
    return [ 1, -1 ];
  } else if (i == 4) {
    return [ 0, -1 ];
  } else if (i == 5) {
    return [ -1, -1 ];
  } else if (i == 6) {
    return [ -1, 0 ];
  } else if (i == 7) {
    return [ -1, 1 ];
  } else if (i == 8) {
    return [ 0, 0 ];
  }
  console.assert(false, "Should not reach this.");
}

function EncodeAction(dx, dy) {
  console.assert(dx == -1 || dx == 1 || dx == 0, "Invalid action.");
  console.assert(dy == -1 || dy == 1 || dy == 0, "Invalid action.");

  if (dx == 0 && dy == 1) {
    return 0;
  }
  if (dx == 1 && dy == 1) {
    return 1;
  }
  if (dx == 1 && dy == 0) {
    return 2;
  }
  if (dx == 1 && dy == -1) {
    return 3;
  }
  if (dx == 0 && dy == -1) {
    return 4;
  }
  if (dx == -1 && dy == -1) {
    return 5;
  }
  if (dx == -1 && dy == 0) {
    return 6;
  }
  if (dx == -1 && dy == 1) {
    return 7;
  }
  if (dx == 0 && dy == 0) {
    return 8;
  }
  console.assert(false, "Should not reach this.");
}

function Softmax(x, temperature = 1.0) {
  x = x.add(-nj.max(x));
  x = x.divide(temperature);
  x = nj.exp(x);
  return x.multiply(1.0 / nj.sum(x));
}

function GetPolicyAtLocation(policy, r, c) {
  let output = nj.zeros([ policy.shape[2] ]);
  for (let u = 0; u < policy.shape[2]; ++u) {
    output.set(u, policy.get(r, c, u));
  }
  return output;
}

class MDPSolver {
  constructor(reward_map, gamma = 0.99) {
    this.rows = reward_map.shape[0];
    this.cols = reward_map.shape[1];
    this.reward_map = reward_map;
    this.value_map = nj.zeros([ this.rows, this.cols ]).add(-1e6);
    this.policy_map = nj.ones([
                          this.rows, this.cols, kNumActions
                        ]).multiply(1.0 / kNumActions);
    // Greediness factor (probability that the world will end at the next step).
    this.gamma = gamma;
    // Tolerances for stopping value iteration.
    this.max_num_iterations = 1000;
    this.min_per_element_value_function_diff = 1e-3;
    // "Temperature" used in the obtaining a distribution over actions in a
    // particular state. Set this closer to zero to have a more 'decisive'
    // policy (which still randomizes across equivalent alternatives).
    this.softmax_temperature = 0.05;
    this.iteration_callback = null;
    this.termination_callback = null;

    this.current_iteration = 0;
    this.diff_per_element = 1e9;
  }

  // Recursively solve the MDP.
  // This weird API is needed to avoid blocking the main thread.
  SolveAsyncWithInterval(interval=1) {
    if (this.TerminationCriteriaSatisfied()) {
      if (this.termination_callback) {
        this.termination_callback(this);
      }
      console.log("Termination condition is already satisfied");
      return;
    }

    let func = function(solver) {
      solver.RunOneIteration();
      if (solver.iteration_callback) {
        solver.iteration_callback(solver);
      }
      solver.SolveAsyncWithInterval(interval);
    };
    setTimeout(func.bind(null, this), interval);
  }

  // Solves the MDP.
  Solve() {
    while (true) {
      this.RunOneIteration();
      console.log("Per-element difference in the value map: " +
                  this.diff_per_element);
      if (this.TerminationCriteriaSatisfied()) {
        break;
      }
      if (this.iteration_callback != null) {
        this.iteration_callback(this);
      }
    }
  }

  // Returns true if it's time to stop running the solver.
  TerminationCriteriaSatisfied() {
    if (this.diff_per_element < this.min_per_element_value_function_diff) {
      return true;
    }
    if (this.current_iteration >= this.max_num_iterations) {
      return true;
    }
    return false;
  }

  // Runs a single iteration of value iteration.
  // Returns L2-norm between previous and current value maps, normalized by
  // the number of elements.
  RunOneIteration() {
    this.current_iteration += 1;
    let prev_value_map = this.value_map.clone();
    for (let r = 0; r < this.rows; ++r) {
      for (let c = 0; c < this.cols; ++c) {
        let values_at_point = this.ComputeValueAtLocation(
            r, c, this.reward_map, this.value_map, this.gamma);
        this.value_map.set(r, c, nj.max(values_at_point));

        // The policy update is probabilistic: all maxima have equal probability
        // of being selected.
        let values_at_point_prob =
            Softmax(values_at_point.clone(), this.softmax_temperature);
        for (let u = 0; u < kNumActions; ++u) {
          this.policy_map.set(r, c, u, values_at_point_prob.get(u));
        }
      }
    }
    this.diff_per_element =
        Math.sqrt(
            (prev_value_map.clone().subtract(this.value_map)).pow(2).sum()) /
        this.value_map.size;
    return this.diff_per_element;
  }

  // Returns a vector of kNumAction entries, each containing the value of
  // taking action u in the current state.
  ComputeValueAtLocation(r, c, reward_map, value_map, gamma) {
    let rows = reward_map.shape[0];
    let cols = reward_map.shape[1];
    let values_at_point = nj.zeros(kNumActions);
    for (let u = 0; u < kNumActions; ++u) {
      let action = DecodeAction(u);
      let dx = action[0];
      let dy = action[1];
      let r_next = Math.max(0, Math.min(rows - 1, r + dy));
      let c_next = Math.max(0, Math.min(cols - 1, c + dx));

      let action_cost = Math.sqrt(dx * dx + dy * dy);
      let reward = reward_map.get(r, c) - action_cost;
      // We have a deterministic MDP, so we don't need to average over
      // state transition distribution.
      let value_at_point = reward + gamma * value_map.get(r_next, c_next);
      values_at_point.set(u, value_at_point);
    }
    return values_at_point;
  }

  // Sets a callback that gets called at each iteration, during Solve().
  // Example callback:
  //   function (solver) { console.log(solver); }
  SetIterationCallback(callback) { this.iteration_callback = callback; }

  // Sets a callback that gets called after the final iteration, once
  // TerminationCriteriaSatisfied() returns true.
  // Example callback:
  //   function (solver) { console.log(solver); }
  SetTerminationCallback(callback) { this.termination_callback = callback; }

}

// This is a hack to get tests to work.
if (typeof exports !== 'undefined') {
  exports.MDPSolver = MDPSolver;
  exports.EncodeAction = EncodeAction;
  exports.DecodeAction = DecodeAction;
  exports.kNumActions = kNumActions;
  exports.Softmax = Softmax;
  exports.GetPolicyAtLocation = GetPolicyAtLocation;
}
