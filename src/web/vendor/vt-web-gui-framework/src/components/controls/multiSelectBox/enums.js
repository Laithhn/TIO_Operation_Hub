import { Enumify } from 'enumify'; // eslint-disable-line max-classes-per-file


/**
 * @typedef {object} MultiSelectBoxStateValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for state of the multiple select box.
 *
 * @property {MultiSelectBoxStateValue} IDLE - The multiple select box is idle and can be used.
 * @property {MultiSelectBoxStateValue} BUSY - The multiple select box is busy.
 * @property {MultiSelectBoxStateValue} ERROR - The multiple select box shows an error.
 * @property {MultiSelectBoxStateValue} DISABLED - The multiple select box is disabled.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {MultiSelectBoxStateValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => MultiSelectBoxStateValue|undefined} enumValueOf - Function that
 *   returns the enumeration value of a given enumeration key or undefined if not found.
 */
export class MultiSelectBoxState extends Enumify {
  static IDLE = new MultiSelectBoxState();
  static BUSY = new MultiSelectBoxState();
  static ERROR = new MultiSelectBoxState();
  static DISABLED = new MultiSelectBoxState();
  static _ = this.closeEnum();
}
