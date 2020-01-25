// Class with utility functions for going back and forth between discrete
// coordinates (e.g. indices of various MDP artifacts) and 'continuous'
// coordinates (e.g. actors' locations).
class MapContext {
  constructor(window_size, num_cells) {
    this.window_size = window_size;
    this.num_cells_in_row = num_cells;
    this.cell_size = window_size / this.num_cells_in_row;
  }

  // Returns the cell at a given location (or a nullptr).
  GetCellAt(x, y) {
    let x_idx = x / this.cell_size;
    let y_idx = y / this.cell_size;
    if (x_idx >= 0 && x_idx < kNumCellsInRow && y_idx >= 0 &&
        y_idx < this.num_cells_in_row) {
      return cells[y_idx * this.num_cells_in_row + x_idx];
    } else {
      return null;
    }
  }

  // Returns index of the cell at a given location.
  // TODO(vasiliy): Do we need this?
  GetCellIndexAt(x, y) {
    let x_idx = parseInt(x / this.cell_size);
    let y_idx = parseInt(y / this.cell_size);
    if (x_idx >= 0 && x_idx < this.num_cells_in_row && y_idx >= 0 &&
        y_idx < this.num_cells_in_row) {
      return y_idx * this.num_cells_in_row + x_idx;
    } else {
      return null;
    }
  }

  // Returns four neighboring cells, with 4 weights summing to 1.
  // This is helpful if one is performing linear interpolation across cells.
  GetNeighboringCellsWithWeights(x, y) {
    let output = [];
    let funcs = [ Math.floor, function(x) { return Math.floor(x) + 1; } ];

    x -= this.cell_size / 2.0;
    y -= this.cell_size / 2.0;

    x = Math.max(0, Math.min(this.window_size - this.cell_size, x));
    y = Math.max(0, Math.min(this.window_size - this.cell_size, y));

    for (let i = 0; i < 2; ++i) {
      let y_idx = this.ClipInRange(funcs[i](y / this.cell_size));
      let neighbor_y = y_idx * this.cell_size;
      let wy = 1.0 - Math.abs(y - neighbor_y) / this.cell_size;
      for (let j = 0; j < 2; ++j) {
        let x_idx = this.ClipInRange(funcs[j](x / this.cell_size));
        let neighbor_x = x_idx * this.cell_size;
        let wx = 1.0 - Math.abs(x - neighbor_x) / this.cell_size;
        output.push({x_idx : x_idx, y_idx : y_idx, weight : wx * wy});
      }
    }
    // Ensure that weights are normalized and sum to 1.
    let weight_sum = 0.0;
    for (let i = 0; i < output.length; ++i) {
      weight_sum += output[i].weight;
    }
    console.assert(weight_sum > 0.0);
    for (let i = 0; i < output.length; ++i) {
      output[i].weight /= weight_sum;
    }

    return output;
  }

  // Returns a bilinearly interpolated value given a 2D map.
  GetInterpolatedValue2D(value_map, x, y) {
    let pts = this.GetNeighboringCellsWithWeights(x, y);
    let output = 0.0;
    for (let i = 0; i < pts.length; ++i) {
      output += pts[i].weight * value_map.get(pts[i].y_idx, pts[i].x_idx);
    }
    return output;
  }

  // Returns a bilinearly interpolated vector given a 3D map.
  GetInterpolatedValue3D(value_map, x, y) {
    let pts = this.GetNeighboringCellsWithWeights(x, y);
    let output = nj.zeros(value_map.shape[2]);
    for (let i = 0; i < pts.length; ++i) {
      for (let u = 0; u < output.size; ++u) {
        let value =
            pts[i].weight * value_map.get(pts[i].y_idx, pts[i].x_idx, u);
        output.set(u, output.get(u) + value);
      }
    }
    return output;
  }

  ClipInRange(index) {
    return Math.min(Math.max(0, index), this.num_cells_in_row - 1);
  }
};

function SampleFromDistribution(pdf) {
  let cdf = [ pdf[0] ];
  for (var i = 1; i < pdf.length; ++i) {
    cdf.push(cdf[i - 1] + pdf[i]);
  }
  let value = Math.random();
  for (let i = 0; i < cdf.length; ++i) {
    if (value <= cdf[i]) {
      return i;
    }
  }
  console.assert("Should not have reached this point! value: " + value +
                 " cdf: " + cdf);
}

// This is a hack to get tests to work.
if (typeof exports !== 'undefined') {
  exports.MapContext = MapContext;
  exports.SampleFromDistribution = SampleFromDistribution;
}
