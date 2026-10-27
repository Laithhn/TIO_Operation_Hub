const defines = require('assets/defines');


/*
 * Exports (must be done with module.exports because of the use of @indigotree/dart-sass-json-importer)
 */
module.exports = {
  showHideTransitionTimeMs: 150,
  imageChangeTransitionTimeMs: 200,
  zoomSteps: [10, 25, 50, 75, 100, 150, 200, 300, 400, 600, 800, 1200],
  minDeltaPinchZoomDist: 2.0,
  contr: {
    rowGap: defines.space.medium,
    rowGapExpanded: defines.space.small,
    rowGapMobile: defines.space.small,
    rowGapMobileExpanded: defines.space.xs,
    padding: defines.space.small,
    paddingExpanded: defines.space.small,
    paddingMobile: defines.space.xs,
    paddingMobileExpanded: 0,
  },
  header: {
    height: 75, // caution: value determined by the heights of the inner elements
    heightExpanded: defines.layout.controls.heightDefault,
  },
  previewImages: {
    height: 65,
    heightTotal: 85, // height (see above) plus 20 pixels for translateY and scale
    translateY: -15,
    scale: 1.05,
    borderWidth: 2,
    columnGap: defines.space.xs,
  },
};
