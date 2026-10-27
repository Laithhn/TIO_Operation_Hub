import { Enumify } from 'enumify';


/**
 * Enum for spinner types. All enumeration values have the default elements "name" and "ordinal".
 *
 * @property {object} CIRCLE - A rotating circle, the default spinner.
 * @property {object} BARS - Pulsing bars.
 * @property {function} enumValues - Return an array with all enum objects.
 */
export class SpinnerType extends Enumify {
  static CIRCLE = new SpinnerType();
  static BARS = new SpinnerType();
  static _ = this.closeEnum();
}
