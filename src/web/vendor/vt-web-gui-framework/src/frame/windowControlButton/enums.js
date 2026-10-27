import { Enumify } from 'enumify'; // eslint-disable-line max-classes-per-file


/**
 * Enum for the types of window control buttons. All enumeration values have the default elements
 * "enumKey", "enumKeys", "enumOrdinal", "enumValues" and "enumValueOf" and additional the element
 * "icon" with the name of the corresponding icon.
 *
 * @property {object} MINIMIZE - Button to minimize a window.
 * @property {object} MAXIMIZE - Button to maximize a window.
 * @property {object} UNMAXIMIZE - Button to unmaximize a window if it is minimized of maximized.
 * @property {object} CLOSE - Button to close a window.
 */
export class WindowControlButtonType extends Enumify {
  static MINIMIZE = new WindowControlButtonType({ icon: 'WINDOWMINIMIZE' });
  static MAXIMIZE = new WindowControlButtonType({ icon: 'WINDOWMAXIMIZE' });
  static UNMAXIMIZE = new WindowControlButtonType({ icon: 'WINDOWUNMAXIMIZE' });
  static CLOSE = new WindowControlButtonType({ icon: 'WINDOWCLOSE' });
  static _ = this.closeEnum();

  constructor({ icon }) {
    super();
    this.icon = icon;
  }
}
