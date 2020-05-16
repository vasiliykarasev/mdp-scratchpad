// A class that provides an estimate of an actor's state, based on a history of
// measurements.
class ActorEstimatorBase {
  constructor() {}
  // Samples a sequence [x(t+1), ..., t(t+N)] given an estimate of actor's
  // state. Formally, given an estimate of the posterior p(x_t | y^t), this
  // function generates a sample from from p(x_{t+1}, ..., x_{t+N} | y^t) This
  // amounts to sampling:
  //   p(x_t | y^t)
  //   p(x_{x+1} | x_{t})
  //   p(x_{x+2} | x_{t+1})
  //   and so on.
  SampleTrajectory(num_steps) { return null; }

  // Updates the state estimate with the new observation. Formally, given
  // p(x_{t-1}| y^{t-1}) (an internally maintained state estimate) and an
  // observation y_t, computes p(x_t | y^t).
  // This could be, as an example, a Kalman filter update.
  AddObservation(observation) { return null; }
};
