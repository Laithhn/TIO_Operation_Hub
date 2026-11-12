import { classNames } from 'utils/classNames';
import { isNonEmptyStringOrNumber } from 'utils/type';

import * as css from './text.scss';
import type { TextProps } from './text.types';


/**
 * React sub-component of the text of the selected option of the control component
 * "SelectBox".
 */
const Text = ({
  disable, noOptionHint, option,
}: TextProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let text;

  if (option) {
    if (option.text) {
      ({ text } = option);
    } else if (isNonEmptyStringOrNumber(option.value, { withoutInfinite: true })) {
      text = option.value;
    } else {
      text = '\u{a0}';
    }
  } else {
    text = noOptionHint || '\u{a0}';
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const textClasses = classNames(css.text, {
    [css.typoDisabled]: disable,
    [css.noOption]: !option,
    [css.italic]: option?.isItalic,
  });

  return (
    <span className={textClasses}>{text}</span>
  );
  //                                                                                  </editor-fold>
};

Text.displayName = 'Text';


export { Text };
