import { Enumify } from 'enumify';


/**
 * @typedef {object} CheckBoxStateValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the state of the check box.
 *
 * @property {CheckBoxStateValue} IDLE - The check box is idle and can be used.
 * @property {CheckBoxStateValue} ERROR - The check box shows an error.
 * @property {CheckBoxStateValue} DISABLED - The check box is disabled.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {CheckBoxStateValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => CheckBoxStateValue|undefined} enumValueOf - Function that returns
 *   the enumeration value of a given enumeration key or undefined if not found.
 */
export class CheckBoxState extends Enumify {
  static IDLE = new CheckBoxState();
  static ERROR = new CheckBoxState();
  static DISABLED = new CheckBoxState();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} CheckBoxTypeValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for check box types.
 *
 * @property {CheckBoxTypeValue} TICK_BOX - A tick box, that is a classical check box.
 * @property {CheckBoxTypeValue} RADIO_BUTTON - A radio button.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {CheckBoxTypeValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => CheckBoxTypeValue|undefined} enumValueOf - Function that returns
 *   the enumeration value of a given enumeration key or undefined if not found.
 */
export class CheckBoxType extends Enumify {
  static TICK_BOX = new CheckBoxType();
  static RADIO_BUTTON = new CheckBoxType();
  static _ = this.closeEnum();
}
