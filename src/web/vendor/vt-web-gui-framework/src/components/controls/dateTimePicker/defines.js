const defines = require('assets/defines');


/*
 * Exports (must be done with module.exports because of the use of @indigotree/dart-sass-json-importer)
 */

module.exports = {
  dateTimePicker: {
    innerHeight: Math.min(24, (defines.layout.controls.heightDefault - 4)), // minus 4 due to a max. bottom border height of 2 pixels
    gapBetweenValuesAndIcons: defines.space.xs, // gap around the delete button and the trailing icon and around the minus between the date/time ranges
    formatTabWidth: defines.space.xs, // the width of tabs (\t), e.g. between date and time
    formatTabWidthDense: defines.space.xxs, // the dense width of tabs, used if it is a range picker
    writingTimeoutMs: 2000,
  },
  calendar: {
    sectionPaddingTop: 'SMALL', // a key of enum GapAndPadding as string
    sectionPaddingBottom: 'SMALL', // a key of enum GapAndPadding as string
    dateSection: {
      dayMinWidth: 38,
      dayHeight: 36,
      todayCircleDiameter: 28,
      todayCircleWidth: 2,
    },
    timeSection: {
      rowGap: 'SMALL', // a key of enum GapAndPadding as string
    },
  },
};
