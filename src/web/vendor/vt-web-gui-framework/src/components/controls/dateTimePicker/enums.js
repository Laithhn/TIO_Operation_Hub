import { Enumify } from 'enumify'; // eslint-disable-line max-classes-per-file


/**
 * @typedef {object} DateTimePickerSelectedDayValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the internal selection state of a day.
 *
 * @property {DateTimePickerSelectedDayValue} UNSELECTED - A day is not selected.
 * @property {DateTimePickerSelectedDayValue} SINGLE_SELECTED - A day is selected seperatelly.
 * @property {DateTimePickerSelectedDayValue} SELECTED_START - A day is the first one of several
 *   selected days.
 * @property {DateTimePickerSelectedDayValue} SELECTED_MIDDLE - A day is one in the middle of
 *   several selected days.
 * @property {DateTimePickerSelectedDayValue} SELECTED_END - A day is the last one of several
 *   selected days.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {DateTimePickerSelectedDayValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => DateTimePickerSelectedDayValue|undefined} enumValueOf - Function
 *   that returns the enumeration value of a given enumeration key or undefined if not found.
 */
export class DateTimePickerSelectedDay extends Enumify {
  static UNSELECTED = new DateTimePickerSelectedDay();
  static SINGLE_SELECTED = new DateTimePickerSelectedDay();
  static SELECTED_START = new DateTimePickerSelectedDay();
  static SELECTED_MIDDLE = new DateTimePickerSelectedDay();
  static SELECTED_END = new DateTimePickerSelectedDay();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} DateTimePickerStateValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for state of the date time picker field.
 *
 * @property {DateTimePickerStateValue} IDLE - The date time picker field is idle and can be used.
 * @property {DateTimePickerStateValue} BUSY - The date time picker field is busy.
 * * @property {DateTimePickerStateValue} ERROR - The date time picker field shows an error.
 * @property {DateTimePickerStateValue} DISABLED - The date time picker field is disabled.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {DateTimePickerStateValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => DateTimePickerStateValue|undefined} enumValueOf - Function that
 *   returns the enumeration value of a given enumeration key or undefined if not found.
 */
export class DateTimePickerState extends Enumify {
  static IDLE = new DateTimePickerState();
  static BUSY = new DateTimePickerState();
  static ERROR = new DateTimePickerState();
  static DISABLED = new DateTimePickerState();
  static _ = this.closeEnum();
}


/**
 * @typedef {object} DateTimePickerTypeValue
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for date time picker types.
 *
 * @property {DateTimePickerTypeValue} DATE_TIME - Date and time can be selected.
 * @property {DateTimePickerTypeValue} DATE - Only the date can be selected.
 * @property {DateTimePickerTypeValue} TIME - Only the time can be selected.
 * @property {DateTimePickerTypeValue} FREE - The free format is given by a prop.
 * @property {DateTimePickerTypeValue} DATE_TIME_RANGE - A range over date and time can be selected.
 * @property {DateTimePickerTypeValue} DATE_RANGE - A range from one date to another can be selected.
 * @property {DateTimePickerTypeValue} TIME_RANGE - A range from one time to another can be selected.
 * @property {DateTimePickerTypeValue} FREE_RANGE - A range from one free format to another can be selected.
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {DateTimePickerTypeValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => DateTimePickerTypeValue|undefined} enumValueOf - Function that
 *   returns the enumeration value of a given enumeration key or undefined if not found.
 */
export class DateTimePickerType extends Enumify {
  static DATE_TIME = new DateTimePickerType();
  static DATE = new DateTimePickerType();
  static TIME = new DateTimePickerType();
  static FREE = new DateTimePickerType();
  static DATE_TIME_RANGE = new DateTimePickerType();
  static DATE_RANGE = new DateTimePickerType();
  static TIME_RANGE = new DateTimePickerType();
  static FREE_RANGE = new DateTimePickerType();
  static _ = this.closeEnum();
}
