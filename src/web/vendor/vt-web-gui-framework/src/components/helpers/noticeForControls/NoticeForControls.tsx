import { classNames } from 'utils/classNames';

import * as css from './noticeForControls.scss';
import type { NoticeForControlsProps } from './noticeForControls.types';


/**
 * React component of the helper component "NoticeForControls" to display an additional
 * notice text below control elements.
 */
const NoticeForControls = ({
  disable = false, notice = '', isErrorText = false,
}: NoticeForControlsProps) => {
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

  const noticeForControlsClasses = classNames(css.noticeForControls, {
    [css.disabled]: disable,
    [css.errorText]: isErrorText,
  });

  return (
    <span className={noticeForControlsClasses}>
      {notice}
    </span>
  );
  //                                                                                  </editor-fold>
};

NoticeForControls.displayName = 'NoticeForControls';


export { NoticeForControls };
