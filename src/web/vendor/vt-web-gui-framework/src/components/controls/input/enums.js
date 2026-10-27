import { Enumify } from 'enumify'; // eslint-disable-line max-classes-per-file


/**
 * @typedef {object} InputTypeValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for input types.
 *
 * @property {InputTypeValue} TEXT - A standard text input field (default).
 * @property {InputTypeValue} NUMBER - A numerical input field.
 * @property {InputTypeValue} FLOAT - A floating point input field.
 * @property {InputTypeValue} PASSWORD - A input field for passwords.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {InputTypeValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => InputTypeValue|undefined} enumValueOf - Function that returns the
 *   enumeration value of a given enumeration key or undefined if not found.
 */
export class InputType extends Enumify {
  static TEXT = new InputType();
  static NUMBER = new InputType();
  static FLOAT = new InputType();
  static PASSWORD = new InputType();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} InputStateValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the state of the input field.
 *
 * @property {InputStateValue} IDLE - The input field is idle and can be used.
 * @property {InputStateValue} BUSY - The input field is busy.
 * @property {InputStateValue} ERROR - The input field shows an error.
 * @property {InputStateValue} DISABLED - The input field is disabled.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {InputStateValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => InputStateValue|undefined} enumValueOf - Function that returns
 *   the enumeration value of a given enumeration key or undefined if not found.
 */
export class InputState extends Enumify {
  static IDLE = new InputState();
  static BUSY = new InputState();
  static ERROR = new InputState();
  static DISABLED = new InputState();
  static _ = this.closeEnum();
}
