import { bbCode } from 'utils/bbCode';
import { classNames } from 'utils/classNames';

import * as css from './labelForControls.scss';
import type { LabelForControlsProps } from './labelForControls.types';


/**
 * React component of the helper component "LabelForControls" for the label a control
 * states beside itself: the words a check box puts its own value in. A control that is named from
 * outside - an input field, a select box - takes its label from the layout around it instead.
 */
const LabelForControls = ({
  disable = false, label = '', labelType = 'value', wrapLabel = false,
}: LabelForControlsProps) => {
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

  const labelForControlsClasses = classNames(css.labelForControls, {
    [css.asLabel]: (labelType === 'label'),
    [css.noWrap]: !wrapLabel,
    [css.typoDisabled]: disable,
  });

  return (
    <span className={labelForControlsClasses}>{bbCode(label.toString())}</span>
  );
  //                                                                                  </editor-fold>
};

LabelForControls.displayName = 'LabelForControls';


export { LabelForControls };
