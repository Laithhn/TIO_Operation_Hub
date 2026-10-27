const defines = require('assets/defines');


/*
 * Exports (must be done with module.exports because of the use of @indigotree/dart-sass-json-importer)
 */

module.exports = {
  partWidth: defines.layout.sidebars.firstSidebarWidth,
  animationTimeMs: defines.layout.defaultAnimationTimeMs,
  linkLevel2: {
    minHeight: 50,
    iconColumnWidth: defines.space.medium,
    iconDim: defines.space.small,
    fontSize: defines.typo.fontSize.normal,
    captionPaddingTopBottom: defines.space.xs,
  },
  linkLevel3: {
    minHeight: 38,
    iconColumnWidth: defines.space.medium,
    fontSize: defines.typo.fontSize.small,
    captionPaddingTopBottom: defines.space.xxs,
  },
  marker: {
    width: 50, // the total width of the marker SVG element
    height: 24, // the total height of the marker SVG element
    topOffset: 8, // vertical offset of the marker to the top
  },
};
