import { Enumify } from 'enumify'; // eslint-disable-line max-classes-per-file


/**
 * @typedef {object} ButtonTypeValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for button types.
 *
 * @property {ButtonTypeValue} RAISED - Raised button.
 * @property {ButtonTypeValue} FLAT - Flat button.
 * @property {ButtonTypeValue} ICON - Icon button.
 * @property {ButtonTypeValue} OVERLAYED - Overlayed button.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {ButtonTypeValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => ButtonTypeValue|undefined} enumValueOf - Function that returns
 *   the enumeration value of a given enumeration key or undefined if not found.
 */
export class ButtonType extends Enumify {
  static RAISED = new ButtonType();
  static FLAT = new ButtonType();
  static ICON = new ButtonType();
  static OVERLAYED = new ButtonType();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} ButtonStateValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for button states.
 *
 * @property {ButtonStateValue} IDLE - Button is idle and can be clicked.
 * @property {ButtonStateValue} BUSY - Button is busy, for raised buttons only.
 * @property {ButtonStateValue} ACTIVE - Button is active, for raised buttons only.
 * @property {ButtonStateValue} DISABLED - Button is disabled.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {ButtonStateValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => ButtonStateValue|undefined} enumValueOf - Function that returns
 *   the enumeration value of a given enumeration key or undefined if not found.
 */
export class ButtonState extends Enumify {
  static IDLE = new ButtonState();
  static BUSY = new ButtonState();
  static ACTIVE = new ButtonState();
  static DISABLED = new ButtonState();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} ButtonHighlightValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for button highlight colors.
 *
 * Changes from v2 to v3: ACCENT1, ACCENT4, GREEN, YELLOW and RED are removed!
 *
 * @property {ButtonHighlightValue} NONE - No highlight color.
 * @property {ButtonHighlightValue} WEAK - Button appears in a not highlighted weak color.
 * @property {ButtonHighlightValue} ATTENTION - Button appears in the blue attention color.
 *   Counterpart in v2: ACCENT1.
 * @property {ButtonHighlightValue} ATTENTION_HIGH - Button appears in the orange high attention
 *   color. Counterpart in v2: ACCENT4.
 * @property {ButtonHighlightValue} SIGNAL_OK - Green button, for raised buttons only. Counterpart
 *   in v2: GREEN.
 * @property {ButtonHighlightValue} SIGNAL_WARNING - Yellow button, for raised buttons only.
 *   Counterpart in v2: YELLOW.
 * @property {ButtonHighlightValue} SIGNAL_ERROR - Red button, for raised buttons only. Counterpart
 *   in v2: RED.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {ButtonHighlightValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => ButtonHighlightValue|undefined} enumValueOf - Function that
 *   returns the enumeration value of a given enumeration key or undefined if not found.
 */
export class ButtonHighlight extends Enumify {
  static NONE = new ButtonHighlight();
  static WEAK = new ButtonHighlight();
  static ATTENTION = new ButtonHighlight();
  static ATTENTION_HIGH = new ButtonHighlight();
  static SIGNAL_OK = new ButtonHighlight();
  static SIGNAL_WARNING = new ButtonHighlight();
  static SIGNAL_ERROR = new ButtonHighlight();
  static _ = this.closeEnum();
}
