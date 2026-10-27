const defines = require('assets/defines');


/*
 * Exports (must be done with module.exports because of the use of @indigotree/dart-sass-json-importer)
 */

module.exports = {
  scrolling: {
    mouseWheelLineHeight: 25,
    arrowKeysScrollSteps: 100,
  },
  scrollBar: {
    color: defines.color.structureSilver,
    scrollWay: {
      thickness: defines.layout.scrollBarThickness, // total thickness of the scrollway
      opacity: 0,
      opacityHover: 0.1,
    },
    handle: {
      minDim: 30, // the minimum dimension (length) of the scroll bar handle
      outerThickness: defines.space.small, // can also be thicker than the scroll way
      innerThickness: 4, // must not be thicker than the outer thickness
      innerThicknessHover: 8, // must not be thicker than the outer thickness
      borderRadius: 2,
      opacity: 0.4,
      opacityHover: 0.5,
    },
  },
  scrollButton: {
    dim: defines.space.medium,
  },
  shader: {
    dimTop: 50,
    dimBottom: 20,
    dimLeft: 50,
    dimRight: 50,
  },
};
