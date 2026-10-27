import { Enumify } from 'enumify'; // eslint-disable-line max-classes-per-file


/**
 * @typedef {object} DataTableCellTypeValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enum for the type of dataset cells. All enumeration values have the default elements "name" and
 * "ordinal".
 *
 * @property {DataTableCellTypeValue} HEADER - The cell is to be a header cell.
 * @property {DataTableCellTypeValue} DATA - The cell is to be a data cell of a dataset
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {DataTableCellTypeValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => DataTableCellTypeValue|undefined} enumValueOf - Function that
 *   returns the enumeration value of a given enumeration key or undefined if not found.
 */
export class DataTableCellType extends Enumify {
  static HEADER = new DataTableCellType();
  static DATA = new DataTableCellType();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} DataTableSortOrderValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enum for the sort order. All enumeration values have the default elements "enumKey", "enumKeys",
 * "enumOrdinal", "enumValues" and "enumValueOf".
 *
 * @property {DataTableSortOrderValue} ASC - Sorting in ascending order (A-B-C, 1-2-3).
 * @property {DataTableSortOrderValue} DESC - Sorting in descending order (C-B-A, 3-2-1).
 * @property {DataTableSortOrderValue} UNSORTED - No sorting order.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {DataTableSortOrderValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => DataTableSortOrderValue|undefined} enumValueOf - Function that
 *   returns the enumeration value of a given enumeration key or undefined if not found.
 */
export class DataTableSortOrder extends Enumify {
  static ASC = new DataTableSortOrder();
  static DESC = new DataTableSortOrder();
  static UNSORTED = new DataTableSortOrder();
  static _ = this.closeEnum();
}
