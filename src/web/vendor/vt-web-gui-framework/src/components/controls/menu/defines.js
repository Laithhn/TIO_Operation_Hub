const defines = require('assets/defines');


/*
 * Exports (must be done with module.exports because of the use of @indigotree/dart-sass-json-importer)
 */

module.exports = {
  itemHeight: defines.layout.controls.heightDefault + 4,
  itemPaddingLeftRight: defines.space.xs,
  dividerSpace: 8, // space above and below the divider line
  iconSize: 20,
  leadingIconWidth: defines.space.medium,
  trailingIconMargin: defines.space.medium,
};
