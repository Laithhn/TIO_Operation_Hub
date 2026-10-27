const defines = require('assets/defines');


/*
 * Exports (must be done with module.exports because of the use of @indigotree/dart-sass-json-importer)
 */

module.exports = {
  input: {
    innerHeight: Math.min(24, (defines.layout.controls.heightDefault - 4)), // minus 4 due to a max. bottom border height of 2 pixels
    gapBetweenTextAndIcon: defines.space.xxxs,
  },
  incDecControls: {
    iconDim: defines.space.xs,
  },
};
