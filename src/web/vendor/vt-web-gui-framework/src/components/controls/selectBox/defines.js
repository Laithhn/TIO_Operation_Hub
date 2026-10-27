const defines = require('assets/defines');


/*
 * Exports (must be done with module.exports because of the use of @indigotree/dart-sass-json-importer)
 */

module.exports = {
  selectBox: {
    innerHeight: Math.min(24, (defines.layout.controls.heightDefault - 4)), // minus 4 due to a max. bottom border height of 2 pixels
    gapBetweenTextAndIcon: defines.space.xxxs,
  },
  selectBoxIcon: {
    dim: defines.layout.controls.iconDimDefault,
  },
  selectBoxMenu: {
    moveMenuAnimationTimeMs: 150,
    spaceToDocument: defines.space.xxs,
    paddingTop: defines.space.xxs,
    paddingBottom: defines.space.xxs,
  },
  selectBoxOption: {
    height: defines.layout.controls.heightDefault + 2,
    paddingLeft: defines.space.xs,
    paddingRight: defines.space.xs,
  },
};
