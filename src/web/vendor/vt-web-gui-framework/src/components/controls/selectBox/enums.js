import { Enumify } from 'enumify'; // eslint-disable-line max-classes-per-file


/**
 * @typedef {object} SelectBoxStateValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the state of the select box.
 *
 * @property {SelectBoxStateValue} IDLE - The select box is idle and can be used.
 * @property {SelectBoxStateValue} BUSY - The select box is busy.
 * @property {SelectBoxStateValue} ERROR - The select box shows an error.
 * @property {SelectBoxStateValue} DISABLED - The select box is disabled.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {SelectBoxStateValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => SelectBoxStateValue|undefined} enumValueOf - Function that
 *   returns the enumeration value of a given enumeration key or undefined if not found.
 */
export class SelectBoxState extends Enumify {
  static IDLE = new SelectBoxState();
  static BUSY = new SelectBoxState();
  static ERROR = new SelectBoxState();
  static DISABLED = new SelectBoxState();
  static _ = this.closeEnum();
}
