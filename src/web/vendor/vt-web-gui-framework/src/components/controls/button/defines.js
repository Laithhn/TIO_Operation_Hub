const defines = require('assets/defines');


/*
 * Exports (must be done with module.exports because of the use of @indigotree/dart-sass-json-importer)
 */

module.exports = {
  raisedButtons: {
    iconSize: defines.layout.controls.iconDimDefault,
    iconSizeLarge: Math.min(24, defines.layout.controls.heightLarge), // this special icon size must not exceed the total dimension of an an icon button
    defaultText: 'Button',
  },
  flatButtons: {
    defaultText: 'Button',
  },
  iconButtons: {
    dim: defines.layout.controls.heightDefault,
    dimLarge: defines.layout.controls.heightLarge,
    iconSize: defines.layout.controls.iconDimDefault,
    iconSizeLarge: defines.layout.controls.iconDimLarge,
    defaultIcon: 'EMOTICONSMILE',
  },
  overlayedButtons: {
    dim: defines.space.medium,
    dimLarge: defines.layout.controls.heightLarge,
    iconSize: defines.layout.controls.iconDimDefault,
    iconSizeLarge: defines.layout.controls.iconDimLarge,
    defaultIcon: 'EMOTICONSMILE',
  },
};
