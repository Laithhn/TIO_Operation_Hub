import { classNames } from 'utils/classNames';

import * as css from './text.scss';
import type { TextProps } from './text.types';


/**
 * React sub-component of the selection text of the control component "MultipleSelectBox".
 */
const Text = ({
  disable, noSelection, text,
}: TextProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


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
    [css.noSelection]: noSelection,
  });

  return (
    <span className={textClasses}>{text || '\u{a0}'}</span>
  );
  //                                                                                  </editor-fold>
};

Text.displayName = 'Text';


export { Text };
