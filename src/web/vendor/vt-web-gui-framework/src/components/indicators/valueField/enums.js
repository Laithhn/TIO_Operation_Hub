import { Enumify } from 'enumify';


/**
 * Enum for state of the input field.
 *
 * @property {object} IDLE - The value field is idle and can be used.
 * @property {object} LOADING - The data for the value field are not yet loaded.
 * @property {object} DISABLED - The value field is disabled.
 * @property {function} enumValues - Return an array with all enum objects.
 */
export class ValueFieldState extends Enumify {
  static IDLE = new ValueFieldState();
  static LOADING = new ValueFieldState();
  static DISABLED = new ValueFieldState();
  static _ = this.closeEnum();
}
