if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

//nj.NdArray.toJSON = function(x) {
//  return JSON.stringify({'shape': x.shape, 'data': x.selection.data});
//};
//
//function NdArrayFromJSON(string) { 
//  const d = JSON.parse(string);
//  let output = nj.zeros(d.shape);
//  output.selection.data = d.data;
//  return output;
//}
