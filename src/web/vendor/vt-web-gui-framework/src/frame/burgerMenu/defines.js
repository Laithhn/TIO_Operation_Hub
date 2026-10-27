const defines = require('assets/defines');


/*
 * Exports (must be done with module.exports because of the use of @indigotree/dart-sass-json-importer)
 */
module.exports = {
  showHideAnimationTimeMs: defines.layout.defaultAnimationTimeMs,
  naviIconDim: defines.space.small,
  linkLevel1: {
    minHeight: 50,
    iconColumnWidth: defines.space.medium,
    iconDim: defines.space.small,
    fontSize: defines.typo.fontSize.normal,
    captionPaddingTopBottom: defines.space.xs,
  },
  linkLevel2: {
    minHeight: 50,
    iconColumnWidth: defines.space.medium,
    iconDim: defines.space.small,
    fontSize: defines.typo.fontSize.small,
    captionPaddingTopBottom: defines.space.xs,
  },
  linkLevel3: {
    minHeight: 38,
    iconColumnWidth: defines.space.medium,
    iconDim: defines.space.small,
    fontSize: defines.typo.fontSize.small,
    captionPaddingTopBottom: defines.space.xxs,
  },
};
