var assert = require('chai').assert;
var expect = require('chai').expect;
var nj = require('numjs');
const format = require('string-format')
var map_context = require('../map_context');

describe('GetNeighboringCellsWithWeights(Simple)', function() {
  // Cells with size=1.
  let map_ctx = new map_context.MapContext(window_size = 5, num_cells = 5);
  let cell_size = map_ctx.cell_size;

  for (let i = 0; i < 5; ++i) {
    it(format('At({},{})', i + cell_size / 2.0, i + cell_size / 2.0),
       function() {
         pts = map_ctx.GetNeighboringCellsWithWeights(i + cell_size / 2.0,
                                                      i + cell_size / 2.0);
         if (i < 4) {
           expect(pts).to.deep.equal([
             {x_idx : i, y_idx : i, weight : 1},
             {x_idx : i + 1, y_idx : i, weight : 0},
             {x_idx : i, y_idx : i + 1, weight : 0},
             {x_idx : i + 1, y_idx : i + 1, weight : 0},
           ]);
         } else {
           expect(pts).to.deep.equal([
             {x_idx : 4, y_idx : 4, weight : 0.25},
             {x_idx : 4, y_idx : 4, weight : 0.25},
             {x_idx : 4, y_idx : 4, weight : 0.25},
             {x_idx : 4, y_idx : 4, weight : 0.25},
           ]);
         }
       });
  }

  let kInvalidLocations = [ -50, 50 ];
  for (let i = 0; i < kInvalidLocations.length; ++i) {
    for (let j = 0; j < kInvalidLocations.length; ++j) {
      it(format('At({}, {})', kInvalidLocations[i], kInvalidLocations[j]),
         function() {
           // This just verifies that weights are reasonable (not NaN).
           pts = map_ctx.GetNeighboringCellsWithWeights(kInvalidLocations[i],
                                                        kInvalidLocations[j]);
           for (let u = 0; u < pts.length; ++u) {
             expect(pts[u].weight).to.be.gte(0.0).lte(1.0);
           }
         });
    }
  }
});

describe('GetNeighboringCellsWithWeights', function() {
  let map_ctx = new map_context.MapContext(window_size = 10, num_cells = 5);
  let cell_size = map_ctx.cell_size;

  it(format('At({},{})', cell_size / 2.0, cell_size / 2.0), function() {
    pts = map_ctx.GetNeighboringCellsWithWeights(cell_size / 2.0,
                                                 cell_size / 2.0);
    expect(pts).to.deep.equal([
      {x_idx : 0, y_idx : 0, weight : 1},
      {x_idx : 1, y_idx : 0, weight : 0},
      {x_idx : 0, y_idx : 1, weight : 0},
      {x_idx : 1, y_idx : 1, weight : 0},
    ]);
  });

  it(format('At({},{})', cell_size, cell_size), function() {
    pts = map_ctx.GetNeighboringCellsWithWeights(cell_size, cell_size);
    expect(pts).to.deep.equal([
      {x_idx : 0, y_idx : 0, weight : 0.25},
      {x_idx : 1, y_idx : 0, weight : 0.25},
      {x_idx : 0, y_idx : 1, weight : 0.25},
      {x_idx : 1, y_idx : 1, weight : 0.25},
    ]);
  });
});

describe('GetInterpolatedValue2D', function() {
  let map_ctx = new map_context.MapContext(window_size = 10, num_cells = 2);
  let reward_map = nj.zeros([ 2, 2 ])
  let cell_size = map_ctx.cell_size;

  reward_map.set(0, 0, 10.0);
  reward_map.set(1, 1, 5.0);

  it(format('At({}, {})', cell_size / 2, cell_size / 2), function() {
    // Exactly at one of the cells.
    let value = map_ctx.GetInterpolatedValue2D(reward_map, cell_size / 2.0,
                                               cell_size / 2.0);
    expect(value).to.be.equal(10.0);
  });

  it(format('At({}, {})', 1.5 * cell_size, 1.5 * cell_size), function() {
    // Exactly at one of the cells.
    let value = map_ctx.GetInterpolatedValue2D(reward_map, 1.5 * cell_size,
                                               1.5 * cell_size);
    expect(value).to.be.equal(5.0);
  });

  it(format('At({}, {})', cell_size, cell_size), function() {
    // Between cells.
    let value =
        map_ctx.GetInterpolatedValue2D(reward_map, cell_size, cell_size);
    expect(value).to.be.equal(15.0/4.0);
  });
});
