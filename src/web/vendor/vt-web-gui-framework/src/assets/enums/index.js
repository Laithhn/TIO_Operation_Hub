import { Enumify } from 'enumify'; // eslint-disable-line max-classes-per-file

import defines from 'assets/defines';


/**
 * @typedef {object} BackgroundColorValue
 * @property {string} color - The corresponding color string as hex value with leading hash.
 * @property {boolean} darkTheme - True if the container has to appear as dark theme with this
 *   background color.
 * @property {boolean} isGradient - True if the color is a gradient color.
 * @property {boolean} isDefault - True if this is the default background color.
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the background color of container elements.
 *
 * Changes from v2 to v3:
 * - LIGHT, SEMILIGHT, MEDIUMLIGHT, MEDIUM, MEDIUM_GRADIENT and DARK are removed. Use OFF_WHITE,
 *   PALE_GRAY, LIGHT_GRAY, GRAY or DARK_GRAY instead.
 * - ACCENT1 and ACCENT4 are replaced by ATTENTION and ATTENTION_HIGH.
 * - RED, PINK, PURPLE, DEEPPURPLE, TEAL, GREEN, LIGHTGREEN, LIME, YELLOW and BROWN are removed, use
 *   one of this instead to signal a status: SIGNAL_OK, SIGNAL_WARNING or SIGNAL_ERROR.
 * - LIGHT_TRANSPARENT, ACCENT1_LIGHT and ACCENT1_TRANSPARENT are removed without replacement.
 *
 * @property {BackgroundColorValue} NONE - is default
 * @property {BackgroundColorValue} OFF_WHITE
 * @property {BackgroundColorValue} PALE_GRAY
 * @property {BackgroundColorValue} LIGHT_GRAY
 * @property {BackgroundColorValue} GRAY
 * @property {BackgroundColorValue} DARK_GRAY
 * @property {BackgroundColorValue} STRUCTURE_SILVER
 * @property {BackgroundColorValue} PRIMARY
 * @property {BackgroundColorValue} PRIMARY_MIDNIGHT
 * @property {BackgroundColorValue} ATTENTION
 * @property {BackgroundColorValue} ATTENTION_HIGH
 * @property {BackgroundColorValue} CALMING_GREEN
 * @property {BackgroundColorValue} IMPULSE_GREEN
 * @property {BackgroundColorValue} SIGNAL_OK - Background color for status "Ok".
 * @property {BackgroundColorValue} SIGNAL_WARNING - Background color for status "Warning".
 * @property {BackgroundColorValue} SIGNAL_ERROR - Background color for status "Error".
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {BackgroundColorValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => BackgroundColorValue|undefined} enumValueOf - Function that
 *   returns the enumeration value of a given enumeration key or undefined if not found.
 */
class BackgroundColor extends Enumify {
  static NONE = new BackgroundColor({ color: 'none', darkTheme: false, isDefault: true });
  static OFF_WHITE = new BackgroundColor({ color: defines.color.offWhite, darkTheme: false });
  static PALE_GRAY = new BackgroundColor({ color: defines.color.paleGray, darkTheme: false });
  static LIGHT_GRAY = new BackgroundColor({ color: defines.color.lightGray, darkTheme: false });
  static GRAY = new BackgroundColor({ color: defines.color.gray, darkTheme: false });
  static DARK_GRAY = new BackgroundColor({ color: defines.color.darkGray, darkTheme: true });
  static STRUCTURE_SILVER = new BackgroundColor({ color: defines.color.structureSilver, darkTheme: true });
  static PRIMARY = new BackgroundColor({ color: defines.color.primary, darkTheme: true });
  static PRIMARY_MIDNIGHT = new BackgroundColor({ color: defines.color.primaryMidnight, darkTheme: true });
  static ATTENTION = new BackgroundColor({ color: defines.color.attention, darkTheme: false });
  static ATTENTION_HIGH = new BackgroundColor({ color: defines.color.attentionHigh, darkTheme: false });
  static CALMING_GREEN = new BackgroundColor({ color: defines.color.calmingGreen, darkTheme: true });
  static IMPULSE_GREEN = new BackgroundColor({ color: defines.color.impulseGreen, darkTheme: false });
  static SIGNAL_OK = new BackgroundColor({ color: defines.color.calmingGreen, darkTheme: true });
  static SIGNAL_WARNING = new BackgroundColor({ color: defines.color.attentionHigh, darkTheme: false });
  static SIGNAL_ERROR = new BackgroundColor({ color: defines.color.signalError, darkTheme: true });
  static _ = this.closeEnum();

  constructor({
    color, darkTheme, isGradient = false, isDefault = false,
  }) {
    super();
    this.color = color;
    this.darkTheme = darkTheme;
    this.isGradient = isGradient;
    this.isDefault = isDefault;
  }
}


/**
 * @typedef {object} BoxShadowValue
 * @property {string} cssValue - The corresponding value for CSS rule "box-shadow".
 * @property {boolean} isDefault - True if this is the default shadow.
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for material design box shadow of grid elements.
 *
 * @property {BoxShadowValue} NONE - No box shadow.
 * @property {BoxShadowValue} LEVEL1
 * @property {BoxShadowValue} LEVEL2
 * @property {BoxShadowValue} LEVEL3
 * @property {BoxShadowValue} LEVEL4
 * @property {BoxShadowValue} LEVEL5
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {BoxShadowValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => BoxShadowValue|undefined} enumValueOf - Function that returns the
 *   enumeration value of a given enumeration key or undefined if not found.
 */
class BoxShadow extends Enumify {
  static NONE = new BoxShadow({ cssValue: 'none', isDefault: true });
  static LEVEL1 = new BoxShadow({ cssValue: defines.layout.boxShadow.level1.replace(/"/g, '') });
  static LEVEL2 = new BoxShadow({ cssValue: defines.layout.boxShadow.level2.replace(/"/g, '') });
  static LEVEL3 = new BoxShadow({ cssValue: defines.layout.boxShadow.level3.replace(/"/g, '') });
  static LEVEL4 = new BoxShadow({ cssValue: defines.layout.boxShadow.level4.replace(/"/g, '') });
  static LEVEL5 = new BoxShadow({ cssValue: defines.layout.boxShadow.level5.replace(/"/g, '') });
  static _ = this.closeEnum();

  constructor({ cssValue, isDefault = false }) {
    super();
    this.cssValue = cssValue;
    this.isDefault = isDefault;
  }
}


/**
 * @typedef {object} ContentScopeValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for content scopes.
 *
 * @property {ContentScopeValue} MAIN - Content is a component and has to be opened in the main
 *   scope.
 * @property {ContentScopeValue} MODWIN - Content is a component and has to be opened in a modal
 *   window.
 * @property {ContentScopeValue} JS - Content is a JavaScript function that has to be executed.
 * @property {ContentScopeValue} BLANK - Content is a URL to open in a new browser tab or window.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {ContentScopeValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => ContentScopeValue|undefined} enumValueOf - Function that returns
 *   the enumeration value of a given enumeration key or undefined if not found.
 */
class ContentScope extends Enumify {
  static MAIN = new ContentScope();
  static MODWIN = new ContentScope();
  static JS = new ContentScope();
  static BLANK = new ContentScope();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} ContentTypeValue
 * @property {string} backgroundColor - The used background color of the content.
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the type of the content loaded into the main scope or into a modal window.
 *
 * @property {ContentTypeValue} NONE - No content is loaded.
 * @property {ContentTypeValue} DASHBOARD - The content is a dashboard.
 * @property {ContentTypeValue} ARTICLE - The content is an article.
 * @property {ContentTypeValue} IFRAME - The content path is an external link, that is shown in an
 *   iframe.
 * @property {ContentTypeValue} ERROR - An error occured so an error content is loaded.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {ContentTypeValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => ContentTypeValue|undefined} enumValueOf - Function that returns
 *   the enumeration value of a given enumeration key or undefined if not found.
 */
class ContentType extends Enumify {
  static NONE = new ContentType({ backgroundColor: defines.layout.dashboard.background });
  static DASHBOARD = new ContentType({ backgroundColor: defines.layout.dashboard.background });
  static ARTICLE = new ContentType({ backgroundColor: defines.layout.article.background });
  static IFRAME = new ContentType({ backgroundColor: defines.layout.article.background });
  static ERROR = new ContentType({ backgroundColor: defines.layout.article.background });
  static _ = this.closeEnum();

  constructor({ backgroundColor }) {
    super();
    this.backgroundColor = backgroundColor;
  }
}


/**
 * @typedef {object} GapAndPaddingValue
 * @property {number} value - The numeric value of the gap or padding in pixels.
 * @property {boolean} isDefault - True if this is the default value.
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for gap and padding of grid elements.
 *
 * @property {GapAndPaddingValue} NONE - No padding.
 * @property {GapAndPaddingValue} XS - space.xxs
 * @property {GapAndPaddingValue} SMALL - space.xs
 * @property {GapAndPaddingValue} NORMAL - space.small
 * @property {GapAndPaddingValue} LARGE - space.medium
 * @property {GapAndPaddingValue} XL - space.large
 * @property {GapAndPaddingValue} XXL - space.xl
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {GapAndPaddingValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => GapAndPaddingValue|undefined} enumValueOf - Function that returns
 *   the enumeration value of a given enumeration key or undefined if not found.
 */
class GapAndPadding extends Enumify {
  static NONE = new GapAndPadding({ value: 0, isDefault: true });
  static XS = new GapAndPadding({ value: defines.space.xxs });
  static SMALL = new GapAndPadding({ value: defines.space.xs });
  static NORMAL = new GapAndPadding({ value: defines.space.small });
  static LARGE = new GapAndPadding({ value: defines.space.medium });
  static XL = new GapAndPadding({ value: defines.space.large });
  static XXL = new GapAndPadding({ value: defines.space.xl });
  static _ = this.closeEnum();

  constructor({ value, isDefault = false }) {
    super();
    this.value = value;
    this.cssValue = `${value}px`;
    this.isDefault = isDefault;
  }
}


/**
 * @typedef {object} GridAutoFlowValue
 * @property {string} cssValue - The corresponding value for CSS rule "grid-auto-flow".
 * @property {boolean} isDefault - True if this is the default value.
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for CSS rule "grid-auto-flow", used by grid elements.
 *
 * @property {GridAutoFlowValue} ROW
 * @property {GridAutoFlowValue} COLUMN
 * @property {GridAutoFlowValue} DENSE
 * @property {GridAutoFlowValue} ROW_DENSE
 * @property {GridAutoFlowValue} COLUMN_DENSE
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {GridAutoFlowValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => GridAutoFlowValue|undefined} enumValueOf - Function that returns
 *   the enumeration value of a given enumeration key or undefined if not found.
 */
class GridAutoFlow extends Enumify {
  static ROW = new GridAutoFlow({ cssValue: 'row', isDefault: true });
  static COLUMN = new GridAutoFlow({ cssValue: 'column' });
  static DENSE = new GridAutoFlow({ cssValue: 'dense' });
  static ROW_DENSE = new GridAutoFlow({ cssValue: 'row dense' });
  static COLUMN_DENSE = new GridAutoFlow({ cssValue: 'column dense' });
  static _ = this.closeEnum();

  constructor({ cssValue, isDefault = false }) {
    super();
    this.cssValue = cssValue;
    this.isDefault = isDefault;
  }
}


/**
 * @typedef {object} MarkerColorValue
 * @property {string} color - The corresponding color string as hex value with leading hash.
 * @property {boolean} isDefault - True if this is the default background color.
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the marker color of container elements.
 *
 * Changes from v2 to v3: the marker colors PRIMARY, ACCENT1, ACCENT2, ACCENT3, ACCENT4, ACCENT5,
 * ACCENT6, RED, PINK, PURPLE, DEEPPURPLE, INDIGO, BLUE, LIGHTBLUE, CYAN, TEAL, GREEN, LIGHTGREEN,
 * LIME, YELLOW, AMBER, ORANGE, DEEPORANGE and BROWN are removed!
 *
 * @property {MarkerColorValue} NONE
 * @property {MarkerColorValue} INVISIBLE
 * @property {MarkerColorValue} GRAY - Very neutral.
 * @property {MarkerColorValue} ATTENTION - Something is needs attention.
 * @property {MarkerColorValue} ATTENTION_HIGH - Something needs high attention.
 * @property {MarkerColorValue} CALMING_GREEN - Something is balanced or neutral or needs some
 *   attention.
 * @property {MarkerColorValue} IMPULSE_GREEN - Something needs attention.
 * @property {MarkerColorValue} SIGNAL_OK - Marker color for status "Ok".
 * @property {MarkerColorValue} SIGNAL_WARNING - Marker color for status "Warning".
 * @property {MarkerColorValue} SIGNAL_ERROR - Marker color for status "Error".
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {MarkerColorValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => MarkerColorValue|undefined} enumValueOf - Function that returns
 *   the enumeration value of a given enumeration key or undefined if not found.
 */
class MarkerColor extends Enumify {
  static NONE = new MarkerColor({ color: 'none', isDefault: true });
  static INVISIBLE = new MarkerColor({ color: 'rgba(0,0,0,0)' });
  static GRAY = new MarkerColor({ color: defines.color.gray });
  static ATTENTION = new MarkerColor({ color: defines.color.attention });
  static ATTENTION_HIGH = new MarkerColor({ color: defines.color.attentionHigh });
  static CALMING_GREEN = new MarkerColor({ color: defines.color.calmingGreen });
  static IMPULSE_GREEN = new MarkerColor({ color: defines.color.impulseGreen });
  static SIGNAL_OK = new MarkerColor({ color: defines.color.calmingGreen });
  static SIGNAL_WARNING = new MarkerColor({ color: defines.color.attentionHigh });
  static SIGNAL_ERROR = new MarkerColor({ color: defines.color.signalError });
  static _ = this.closeEnum();

  constructor({ color, isDefault = false }) {
    super();
    this.color = color;
    this.isDefault = isDefault;
  }
}


/**
 * @typedef {object} MenusAppearanceValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the appearance of the primary and secondary menu.
 *
 * @property {MenusAppearanceValue} DEFAULT - By default, the menu is shown in a classic style with
 *   menu entries in the header and in the first sidebar.
 * @property {MenusAppearanceValue} MEGA_MENU - All menu items are completely shown in one drop down
 *   with a hamburger icon.
 * @property {MenusAppearanceValue} BURGER_MENU - The complete menu is shown as a typical hamburger
 *   menu with context menu in the header.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {MenusAppearanceValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => MenusAppearanceValue|undefined} enumValueOf - Function that
 *   returns the enumeration value of a given enumeration key or undefined if not found.
 */
class MenusAppearance extends Enumify {
  static DEFAULT = new MenusAppearance();
  static MEGA_MENU = new MenusAppearance();
  static BURGER_MENU = new MenusAppearance();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} ObjectFitValue
 * @property {string} cssValue - The corresponding value for CSS rule "object-fit".
 * @property {boolean} isDefault - True if this is the default object fit value.
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the fitting of objects.
 *
 * @property {ObjectFitValue} FILL - (Default)
 * @property {ObjectFitValue} CONTAIN
 * @property {ObjectFitValue} COVER
 * @property {ObjectFitValue} NONE
 * @property {ObjectFitValue} SCALE_DOWN
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {ObjectFitValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => ObjectFitValue|undefined} enumValueOf - Function that returns the
 *   enumeration value of a given enumeration key or undefined if not found.
 */
class ObjectFit extends Enumify {
  static FILL = new ObjectFit({ cssValue: 'fill', isDefault: true });
  static CONTAIN = new ObjectFit({ cssValue: 'contain' });
  static COVER = new ObjectFit({ cssValue: 'cover' });
  static NONE = new ObjectFit({ cssValue: 'none' });
  static SCALE_DOWN = new ObjectFit({ cssValue: 'scale-down' });
  static _ = this.closeEnum();

  constructor({ cssValue, isDefault = false }) {
    super();
    this.cssValue = cssValue;
    this.isDefault = isDefault;
  }
}


/**
 * @typedef {object} PlaceContentValue
 * @property {string} cssValue - The corresponding value for CSS rules "justify-content",
 *   "align-content" and "place-content".
 * @property {boolean} isDefault - True if this is the default value.
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for CSS properties "justify-content", "align-content" and "place-content", used by
 * grid elements.
 *
 * @property {PlaceContentValue} AUTO
 * @property {PlaceContentValue} START
 * @property {PlaceContentValue} END
 * @property {PlaceContentValue} CENTER
 * @property {PlaceContentValue} STRETCH
 * @property {PlaceContentValue} SPACE_AROUND
 * @property {PlaceContentValue} SPACE_BETWEEN
 * @property {PlaceContentValue} SPACE_EVENLY
 * @property {PlaceContentValue} BASELINE
 * @property {PlaceContentValue} FIRST_BASELINE
 * @property {PlaceContentValue} LAST_BASELINE
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {PlaceContentValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => PlaceContentValue|undefined} enumValueOf - Function that returns
 *   the enumeration value of a given enumeration key or undefined if not found.
 */
class PlaceContent extends Enumify {
  static AUTO = new PlaceContent({ cssValue: 'auto', isDefault: true });
  static START = new PlaceContent({ cssValue: 'start' });
  static END = new PlaceContent({ cssValue: 'end' });
  static CENTER = new PlaceContent({ cssValue: 'center' });
  static STRETCH = new PlaceContent({ cssValue: 'stretch' });
  static SPACE_AROUND = new PlaceContent({ cssValue: 'space-around' });
  static SPACE_BETWEEN = new PlaceContent({ cssValue: 'space-between' });
  static SPACE_EVENLY = new PlaceContent({ cssValue: 'space-evenly' });
  static BASELINE = new PlaceContent({ cssValue: 'baseline' });
  static FIRST_BASELINE = new PlaceContent({ cssValue: 'first baseline' });
  static LAST_BASELINE = new PlaceContent({ cssValue: 'last baseline' });
  static _ = this.closeEnum();

  constructor({ cssValue, isDefault = false }) {
    super();
    this.cssValue = cssValue;
    this.isDefault = isDefault;
  }
}


/**
 * @typedef {object} PlaceSelfItemsValue
 * @property {string} cssValue - The corresponding value for CSS rules "justify-self", "align-self",
 *   "place-self", "justify-items", "align-items" and "place-items".
 * @property {boolean} isDefault - True if this is the default value.
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for CSS properties "justify-self", "align-self", "place-self", "justify-items",
 * "align-items" and "place-items", used by grid elements.
 *
 * @property {PlaceSelfItemsValue} AUTO
 * @property {PlaceSelfItemsValue} START
 * @property {PlaceSelfItemsValue} END
 * @property {PlaceSelfItemsValue} CENTER
 * @property {PlaceSelfItemsValue} STRETCH
 * @property {PlaceSelfItemsValue} BASELINE
 * @property {PlaceSelfItemsValue} FIRST_BASELINE
 * @property {PlaceSelfItemsValue} LAST_BASELINE
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {PlaceSelfItemsValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => PlaceSelfItemsValue|undefined} enumValueOf - Function that
 *   returns the enumeration value of a given enumeration key or undefined if not found.
 */
class PlaceSelfItems extends Enumify {
  static AUTO = new PlaceSelfItems({ cssValue: 'auto', isDefault: true });
  static START = new PlaceSelfItems({ cssValue: 'start' });
  static END = new PlaceSelfItems({ cssValue: 'end' });
  static CENTER = new PlaceSelfItems({ cssValue: 'center' });
  static STRETCH = new PlaceSelfItems({ cssValue: 'stretch' });
  static BASELINE = new PlaceSelfItems({ cssValue: 'baseline' });
  static FIRST_BASELINE = new PlaceSelfItems({ cssValue: 'first baseline' });
  static LAST_BASELINE = new PlaceSelfItems({ cssValue: 'last baseline' });
  static _ = this.closeEnum();

  constructor({ cssValue, isDefault = false }) {
    super();
    this.cssValue = cssValue;
    this.isDefault = isDefault;
  }
}


/**
 * @typedef {object} PositionValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for element positions.
 *
 * @property {PositionValue} LEFT
 * @property {PositionValue} RIGHT
 * @property {PositionValue} TOP
 * @property {PositionValue} BOTTOM
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {PositionValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => PositionValue|undefined} enumValueOf - Function that returns the
 *   enumeration value of a given enumeration key or undefined if not found.
 */
class Position extends Enumify {
  static LEFT = new Position();
  static RIGHT = new Position();
  static TOP = new Position();
  static BOTTOM = new Position();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} ReadingDirectionValue
 * @property {string} cssValue - The corresponding value for the CSS value "direction" or for the
 *   HTML attribute "dir".
 * @property {boolean} isDefault - True if this is the default value.
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the read and write direction of elements.
 *
 * @property {ReadingDirectionValue} AUTO - Automatic setting of the read and write direction.
 * @property {ReadingDirectionValue} LTR - Force left to right direction.
 * @property {ReadingDirectionValue} RTL - Force right to left direction.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {ReadingDirectionValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => ReadingDirectionValue|undefined} enumValueOf - Function that
 *   returns the enumeration value of a given enumeration key or undefined if not found.
 */
class ReadingDirection extends Enumify {
  static AUTO = new ReadingDirection({ cssValue: 'auto', isDefault: true });
  static LTR = new ReadingDirection({ cssValue: 'ltr' });
  static RTL = new ReadingDirection({ cssValue: 'rtl' });
  static _ = this.closeEnum();

  constructor({ cssValue, isDefault = false }) {
    super();
    this.cssValue = cssValue;
    this.isDefault = isDefault;
  }
}


/**
 * @typedef {object} StepperStateValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for stepper states.
 *
 * @property {StepperStateValue} OPEN - The step is open, has not yet been processed.
 * @property {StepperStateValue} DONE - The step is currently being or has already been processed.
 * @property {StepperStateValue} VERIFIED - The step has been processed and checked.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {StepperStateValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => StepperStateValue|undefined} enumValueOf - Function that returns
 *   the enumeration value of a given enumeration key or undefined if not found.
 */
class StepperState extends Enumify {
  static OPEN = new StepperState();
  static DONE = new StepperState();
  static VERIFIED = new StepperState();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} StorageTypeValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the type of the storage.
 *
 * @property {StorageTypeValue} INTERNAL - No external, only internal storage.
 * @property {StorageTypeValue} SESSION - The Session Web Storage.
 * @property {StorageTypeValue} LOCAL - The Local Web Storage.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {StorageTypeValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => StorageTypeValue|undefined} enumValueOf - Function that returns
 *   the enumeration value of a given enumeration key or undefined if not found.
 */
class StorageType extends Enumify {
  static INTERNAL = new StorageType();
  static SESSION = new StorageType();
  static LOCAL = new StorageType();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} SystemStateValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for common system states.
 *
 * @property {SystemStateValue} OK - All right.
 * @property {SystemStateValue} WARNING - There is a warning.
 * @property {SystemStateValue} ERROR - There is an error.
 * @property {SystemStateValue} UNKNOWN - An unknown system state.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {SystemStateValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => SystemStateValue|undefined} enumValueOf - Function that returns
 *   the enumeration value of a given enumeration key or undefined if not found.
 */
class SystemState extends Enumify {
  static OK = new SystemState();
  static WARNING = new SystemState();
  static ERROR = new SystemState();
  static UNKNOWN = new SystemState();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} TextAlignValue
 * @property {string} cssValue - The corresponding value for CSS rule "text-align".
 * @property {boolean} isDefault - True if this is the default value.
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for CSS rule "text-align", used by grid elements.
 *
 * @property {TextAlignValue} AUTO - (default)
 * @property {TextAlignValue} START
 * @property {TextAlignValue} END
 * @property {TextAlignValue} LEFT
 * @property {TextAlignValue} RIGHT
 * @property {TextAlignValue} CENTER
 * @property {TextAlignValue} JUSTIFY
 * @property {TextAlignValue} JUSTIFY_ALL
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {TextAlignValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => TextAlignValue|undefined} enumValueOf - Function that returns the
 *   enumeration value of a given enumeration key or undefined if not found.
 */
class TextAlign extends Enumify {
  static AUTO = new TextAlign({ cssValue: 'auto', isDefault: true });
  static START = new TextAlign({ cssValue: 'start' });
  static END = new TextAlign({ cssValue: 'end' });
  static LEFT = new TextAlign({ cssValue: 'left' });
  static RIGHT = new TextAlign({ cssValue: 'right' });
  static CENTER = new TextAlign({ cssValue: 'center' });
  static JUSTIFY = new TextAlign({ cssValue: 'justify' });
  static JUSTIFY_ALL = new TextAlign({ cssValue: 'justify-all' });
  static _ = this.closeEnum();

  constructor({ cssValue, isDefault = false }) {
    super();
    this.cssValue = cssValue;
    this.isDefault = isDefault;
  }
}


/**
 * @typedef {object} TextTypeValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the text type of element.
 *
 * @property {TextTypeValue} HEADLINE - The text is a headline.
 * @property {TextTypeValue} TITLE - The text is a title.
 * @property {TextTypeValue} LABEL - The text is a label.
 * @property {TextTypeValue} HINT - The text is a hint.
 * @property {TextTypeValue} VALUE - The text is a value.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {TextTypeValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => TextTypeValue|undefined} enumValueOf - Function that returns the
 *   enumeration value of a given enumeration key or undefined if not found.
 */
class TextType extends Enumify {
  static HEADLINE = new TextType();
  static TITLE = new TextType();
  static LABEL = new TextType();
  static HINT = new TextType();
  static VALUE = new TextType();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} ValueColorValue
 * @property {string} color - The corresponding color string as hex value with leading hash.
 * @property {string} darkThemeColor - The corresponding color string as hex value with leading hash
 *   if the background has a dark theme color.
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the font color of value text elements.
 *
 * Changes from v2 to v3: ACCENT1, ACCENT4, RED and GREEN are removed!
 *
 * @property {ValueColorValue} NONE
 * @property {ValueColorValue} ATTENTION
 * @property {ValueColorValue} ATTENTION_HIGH
 * @property {ValueColorValue} SIGNAL_OK
 * @property {ValueColorValue} SIGNAL_WARNING
 * @property {ValueColorValue} SIGNAL_ERROR
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {ValueColorValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => ValueColorValue|undefined} enumValueOf - Function that returns
 *   the enumeration value of a given enumeration key or undefined if not found.
 */
class ValueColor extends Enumify {
  static NONE = new ValueColor({ color: 'none', darkThemeColor: 'none' });
  static ATTENTION = new ValueColor({ color: defines.typo.color.dark.attention, darkThemeColor: defines.typo.color.light.attention });
  static ATTENTION_HIGH = new ValueColor({ color: defines.typo.color.dark.attentionHigh, darkThemeColor: defines.typo.color.light.attentionHigh });
  static SIGNAL_OK = new ValueColor({ color: defines.typo.color.dark.calmingGreen, darkThemeColor: defines.typo.color.light.calmingGreen });
  static SIGNAL_WARNING = new ValueColor({ color: defines.typo.color.dark.attentionHigh, darkThemeColor: defines.typo.color.light.attentionHigh });
  static SIGNAL_ERROR = new ValueColor({ color: defines.typo.color.dark.signalError, darkThemeColor: defines.typo.color.light.signalError });
  static _ = this.closeEnum();

  constructor({ color, darkThemeColor }) {
    super();
    this.color = color;
    this.darkThemeColor = darkThemeColor;
  }
}


/**
 * @typedef {object} ValueSizeValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the font size of value text element.
 *
 * @property {ValueSizeValue} SMALL - The default font size of value texts.
 * @property {ValueSizeValue} NORMAL
 * @property {ValueSizeValue} LARGE
 * @property {ValueSizeValue} XL
 * @property {ValueSizeValue} XXL
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {ValueSizeValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => ValueSizeValue|undefined} enumValueOf - Function that returns the
 *   enumeration value of a given enumeration key or undefined if not found.
 */
class ValueSize extends Enumify {
  static SMALL = new ValueSize();
  static NORMAL = new ValueSize();
  static LARGE = new ValueSize();
  static XL = new ValueSize();
  static XXL = new ValueSize();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} VisibilityValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the font size of value text element.
 *
 * @property {VisibilityValue} READY_TO_FADE_IN
 * @property {VisibilityValue} FADE_IN
 * @property {VisibilityValue} SHOW
 * @property {VisibilityValue} READY_TO_FADE_OUT
 * @property {VisibilityValue} FADE_OUT
 * @property {VisibilityValue} HIDE
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {VisibilityValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => VisibilityValue|undefined} enumValueOf - Function that returns
 *   the enumeration value of a given enumeration key or undefined if not found.
 */
class Visibility extends Enumify {
  static READY_TO_FADE_IN = new Visibility();
  static FADE_IN = new Visibility();
  static SHOW = new Visibility();
  static READY_TO_FADE_OUT = new Visibility();
  static FADE_OUT = new Visibility();
  static HIDE = new Visibility();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} WebSocketStateValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the state of a WebSocket connection.
 *
 * @property {WebSocketStateValue} CONNECTING - The connection is not yet open.
 * @property {WebSocketStateValue} OPEN - The connection is open and ready to communicate.
 * @property {WebSocketStateValue} CLOSING - The connection is in the process of closing.
 * @property {WebSocketStateValue} CLOSED - The connection is closed.
 * @property {WebSocketStateValue} ERROR - The connection could not be opened.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {WebSocketStateValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => WebSocketStateValue|undefined} enumValueOf - Function that
 *   returns the enumeration value of a given enumeration key or undefined if not found.
 */
class WebSocketState extends Enumify {
  static CONNECTING = new WebSocketState();
  static OPEN = new WebSocketState();
  static CLOSING = new WebSocketState();
  static CLOSED = new WebSocketState();
  static ERROR = new WebSocketState();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} WebSocketServerValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the state of a WebSocket connection.
 *
 * @property {WebSocketServerValue} NOT_SPECIFIED - The server is not specified and has no known API.
 * @property {WebSocketServerValue} VTWSE - The server is VtWebSocketEngine.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {WebSocketServerValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => WebSocketServerValue|undefined} enumValueOf - Function that
 *   returns the enumeration value of a given enumeration key or undefined if not found.
 */
class WebSocketServer extends Enumify {
  static NOT_SPECIFIED = new WebSocketServer();
  static VTWSE = new WebSocketServer();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} WebSocketServerStateValue
 * @property {boolean} isConnection - true if CONNECTED, INVALID, NO_AUTHENTICATION and READY.
 * @property {boolean} isInit - true if NO_AUTHENTICATION, INTERRUPTED and READY.
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the total state of a WebSocket connection to a server inclusive authentication.
 *
 * @property {WebSocketServerStateValue} UNDEFINED - The WebSocket connection is not defined,
 *   neither in the configuration nor by opening with an action creator.
 * @property {WebSocketServerStateValue} NOT_CONNECTED - The WebSocket connection is defined but not
 *   yet established. Information about the WebSocket server has not been received before.
 * @property {WebSocketServerStateValue} CONNECTED - The WebSocket connection is established but no
 *   information about the WebSocket server have been received yet.
 * @property {WebSocketServerStateValue} INVALID - The WebSocket connection is established.
 *   Information about the WebSocket server has been received but the verification of this
 *   information failed.
 * @property {WebSocketServerStateValue} NO_AUTHENTICATION - A authentication is used for this
 *   WebSocket connection but the user is not authenticated at the moment.
 * @property {WebSocketServerStateValue} INTERRUPTED - The WebSocket connection was already
 *   established and information about the WebSocket server were received. But after that the
 *   connection is lost.
 * @property {WebSocketServerStateValue} READY - The WebSocket connection is established. The
 *   message with the information about the WebSocket server are received valid. Authentication (if
 *   used) is successfully done.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {WebSocketServerStateValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => WebSocketServerStateValue|undefined} enumValueOf - Function that
 *   returns the enumeration value of a given enumeration key or undefined if not found.
 */
class WebSocketServerState extends Enumify {
  static UNDEFINED = new WebSocketServerState({ isConnection: false, isInit: false });
  static NOT_CONNECTED = new WebSocketServerState({ isConnection: false, isInit: false });
  static CONNECTED = new WebSocketServerState({ isConnection: true, isInit: false });
  static INVALID = new WebSocketServerState({ isConnection: true, isInit: false });
  static NO_AUTHENTICATION = new WebSocketServerState({ isConnection: true, isInit: true });
  static INTERRUPTED = new WebSocketServerState({ isConnection: false, isInit: true });
  static READY = new WebSocketServerState({ isConnection: true, isInit: true });
  static _ = this.closeEnum();

  constructor({ isConnection, isInit }) {
    super();
    this.isConnection = isConnection;
    this.isInit = isInit;
  }
}


export default {
  BackgroundColor,
  BoxShadow,
  ContentScope,
  ContentType,
  GapAndPadding,
  GridAutoFlow,
  MarkerColor,
  MenusAppearance,
  ObjectFit,
  PlaceContent,
  PlaceSelfItems,
  Position,
  ReadingDirection,
  StepperState,
  StorageType,
  SystemState,
  TextAlign,
  TextType,
  ValueColor,
  ValueSize,
  Visibility,
  WebSocketState,
  WebSocketServer,
  WebSocketServerState,
};
