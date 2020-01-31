var assert = require('chai').assert;
var expect = require('chai').expect;
var nj = require('numjs');
const format = require('string-format')
var mdp = require('../mdp');

function norm(x, y) {
  let diff = x.subtract(y);
  return Math.sqrt(diff.multiply(diff).sum());
}

describe('Action parsing', function() {
  // Ensures that Encode/DecodeAction form an identity.
  for (let i = 0; i < mdp.kNumActions; ++i) {
    it(format('DecodeAction(EncodeAction({})) == {}', i, i), function() {
      u = mdp.DecodeAction(i);
      let action_idx = mdp.EncodeAction(u[0], u[1]);
      assert.equal(action_idx, i);
    });
  }
});

describe('Softmax', function() {
  it('Produces expected result', function() {
    let y = mdp.Softmax(nj.ones(5));
    let expected = nj.ones(5).multiply(0.2);
    assert.equal(0.0, norm(y, expected));
  });
});

describe('MDPSolver', function() {
  // Solves a tiny MDP with two states, where one state has a negative reward
  // and another has a zero reward.
  // The best thing to do is to move to the second state, and to remain there.
  reward_map = nj.zeros([ 1, 2 ]);
  reward_map.set(0, 0, -1.0);

  let solver = new mdp.MDPSolver(reward_map, gamma = 0.9);
  // Ensure that actions are more or less deterministic.
  solver.softmax_temperature = 0.01;
  solver.Solve();

  it('Computes correct polocy at (0, 1)', function() {
    let policy = mdp.GetPolicyAtLocation(solver.policy_map, 0, 1);
    let action_idx = mdp.EncodeAction(dx = 0, dy = 0);
    expect(policy.get(action_idx))
        .to.be.greaterThan(
            0.99, 'In this state, best action should be to remain still.');
  });

  it('Computes correct policy at (0, 0)', function() {
    let policy = mdp.GetPolicyAtLocation(solver.policy_map, 0, 0);
    let action_idx = mdp.EncodeAction(dx = 1, dy = 0);
    expect(policy.get(action_idx))
        .to.be.greaterThan(
            0.99, 'In this state, best action should be to move right.');
  });
});

describe('JSONconversions', function() {
  it('Identity2D', function() {
    let x = nj.random([ 3, 4 ]);
    let y = mdp.ParseFromJSON(mdp.SaveAsJSON(x));
    assert.equal(0.0, norm(x, y));
  });
  it('Identity3D', function() {
    let x = nj.random([ 3, 4, 3 ]);
    let y = mdp.ParseFromJSON(mdp.SaveAsJSON(x));
    assert.equal(0.0, norm(x, y));
  });
});
