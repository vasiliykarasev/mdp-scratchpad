class Actor {
  constructor(el, x, y) {
    this.el = el;
    this.x = x;
    this.y = y;
    this.speed = 0.0;
    this.ux = 0;
    this.uy = 0;
  }

  // Selects the action from the policy.
  ChooseAction(interpolator, policy_map) {
    const actions_probs =
        interpolator.GetInterpolatedValue3D(policy_map, this.x, this.y)
            .tolist();
    const sample_idx = SampleFromDistribution(actions_probs);
    const u = DecodeAction(sample_idx);
    this.SetAction(u[0], u[1]);
  }


  // Sets the current action.
  SetAction(ux, uy) {
    if (this.speed == 0) {
      return;
    }
    const kLambda = 0.25;
    this.ux = kLambda * ux + (1.0 - kLambda) * this.ux;
    this.uy = kLambda * uy + (1.0 - kLambda) * this.uy;
  }

  // Applies the 'dynamics' update: x_{t+1} = f(x_t; u_t )
  Update() {
    if (this.speed == 0) {
      return;
    }
    this.x += this.speed * this.ux;
    this.y += this.speed * this.uy;
  }
};

class GoalSwitchingActor extends Actor {
  constructor(el, x, y, num_goals, goal_switching_probability = 0.0) {
    super(el, x, y);
    this.num_goals = num_goals;
    this.goal_switching_probability = goal_switching_probability;
    // Select a goal uniformly at random:
    this.current_goal_index = Math.floor(Math.random() * num_goals);
    console.log(goal_switching_probability);
  }

  // Selects the action from a collection of policies, according to the 
  // currently selected goal.
  ChooseAction(interpolator, policy_maps) {
    super.ChooseAction(interpolator, policy_maps[this.current_goal_index]);
  }

  Update() {
    super.Update();
    this.MaybeSwitchGoal();
  }

  MaybeSwitchGoal() {
    if (Math.random() >= this.goal_switching_probability) {
      return;
    }
    console.log("Switching goal.");
    const alternative_goal_index = [];
    for (let i = 0; i < this.num_goals; ++i) {
      if (i == this.current_goal_index) {
        continue;
      }
      alternative_goal_index.push(i);
    }
    const sampled_index = Math.floor(Math.random() * (this.num_goals - 1));
    this.current_goal_index = alternative_goal_index[sampled_index];
  }
}
