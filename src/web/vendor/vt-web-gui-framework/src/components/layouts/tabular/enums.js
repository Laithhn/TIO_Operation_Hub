import { Enumify } from 'enumify';


/**
 * @typedef {object} TabularStyleValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for tabular style of grid element "Tabular".
 *
 * @property {TabularStyleValue} LINE - The tabular entries are seperated by lines.
 * @property {TabularStyleValue} BACKGROUND - The tabular entries are seperated by the background
 *   colors.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {TabularStyleValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => TabularStyleValue|undefined} enumValueOf - Function that returns
 *   the enumeration value of a given enumeration key or undefined if not found.
 */
export class TabularStyle extends Enumify {
  static LINE = new TabularStyle();
  static BACKGROUND = new TabularStyle();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} TabularValueItemStateValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the state of the value of the tabular value item.
 *
 * @property {TabularValueItemStateValue} IDLE - The tabular value item is idle and can be used.
 * @property {TabularValueItemStateValue} LOADING - The data for the tabular value item are not yet
 *   loaded.
 * @property {TabularValueItemStateValue} DISABLED - The tabular value item is disabled.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {TabularValueItemStateValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => TabularValueItemStateValue|undefined} enumValueOf - Function that
 *   returns the enumeration value of a given enumeration key or undefined if not found.
 */
export class TabularValueItemState extends Enumify {
  static IDLE = new TabularValueItemState();
  static LOADING = new TabularValueItemState();
  static DISABLED = new TabularValueItemState();
  static _ = this.closeEnum();
}
