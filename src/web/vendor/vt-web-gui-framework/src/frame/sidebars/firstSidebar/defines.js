const defines = require('assets/defines');


/*
 * Exports (must be done with module.exports because of the use of @indigotree/dart-sass-json-importer)
 */

module.exports = {
  marker: {
    width: 24, // the total width of the marker SVG element, half of which is placed outside the sidebar
    height: 50, // the total height of the marker SVG element
  },
  primarySubmenu: {
    entry: {
      iconDim: defines.space.small,
      paddingBottomIfOpen: defines.space.xs,
      heightAnimationTimeMs: defines.system.contentChangeFadeOutTimeMs,
    },
  },
  stepper: {
    step: {
      iconDim: 24,
      sepWidth: 2,
      sepMinHeight: 40,
    },
  },
};
