// eslint-disable-next-line max-classes-per-file
import { Enumify } from 'utils/enumify';


/**
 * Enum for stepper orientation. All enumeration values have the default elements "enumKey", "enumKeys",
 * "enumOrdinal", "enumValues" and "enumValueOf".
 *
 * @property {object} VERTICAL - Vertical alignment of the stepper.
 * @property {object} HORIZONTAL - Horizontal alignment of the stepper.
 */
export class StepperOrientation extends Enumify {
  static VERTICAL = new StepperOrientation();
  static HORIZONTAL = new StepperOrientation();
  static _ = this.closeEnum();
}


/**
 * Enum for stepper states. All enumeration values have the default elements "enumKey", "enumKeys",
 * "enumOrdinal", "enumValues" and "enumValueOf".
 *
 * @property {object} OPEN - The step is open, has not yet been processed.
 * @property {object} DONE - The step is currently being or has already been processed.
 * @property {object} VERIFIED - The step has been processed and checked.
 */
export class SidebarStatus extends Enumify {
  static OPEN = new SidebarStatus();
  static DONE = new SidebarStatus();
  static VERIFIED = new SidebarStatus();
  static _ = this.closeEnum();
}
