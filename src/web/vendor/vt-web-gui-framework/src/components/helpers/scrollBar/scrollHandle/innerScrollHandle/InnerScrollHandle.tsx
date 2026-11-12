import { classNames } from 'utils/classNames';

import * as css from './innerScrollHandle.scss';
import type { InnerScrollHandleProps } from './innerScrollHandle.types';


/**
 * React sub-component of the visible part of the scroll bar handle of the helper
 * component "ScrollBar".
 */
const InnerScrollHandle = ({ vertical, status }: InnerScrollHandleProps) => {
  //                                                                                  </editor-fold>
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

  const innerScrollHandleClasses = classNames(css.innerScrollHandle, {
    [css.vertical]: vertical,
    [css.inactive]: (status === 'inactive'),
    [css.hover]: (status === 'hover'),
  });

  return (
    <div className={innerScrollHandleClasses} />
  );
  //                                                                                  </editor-fold>
};

InnerScrollHandle.displayName = 'InnerScrollHandle';


export { InnerScrollHandle };
