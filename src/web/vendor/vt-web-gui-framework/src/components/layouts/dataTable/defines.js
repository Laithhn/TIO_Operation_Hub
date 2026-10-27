const defines = require('assets/defines');


/*
 * Exports (must be done with module.exports because of the use of @indigotree/dart-sass-json-importer)
 */

module.exports = {
  dataTable: {
    expandTableTopBottomFactor: 0.3,
    expandTableLeftRightFactor: 0.3,
    defaultColumnWidth: defines.space.xl,
    defaultRowHeight: defines.space.medium,
    defaultAverageDatasetHeight: defines.space.medium,
  },
  datasetPart: {
    paddingLeft: defines.space.xs,
    paddingRight: defines.space.xs,
    backgroundColor: defines.color.offWhite,
    backgroundColorFocus: '#d7dadd', // defines.layout.controls.color.dark.backgroundClick on top of defines.color.offWhite
  },
};
