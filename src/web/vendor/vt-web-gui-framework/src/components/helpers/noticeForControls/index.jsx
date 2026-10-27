import PropTypes from 'prop-types';
import { memo } from 'react';

import classNames from 'utils/classNames';

import css from './noticeForControls.scss';


/**
 * Memoized React component of an absolute positioned additional notice text used inside several
 * control elements.
 */
const NoticeForControls = memo(({
  top, right, bottom, left, darkTheme, disabled, notice, isErrorText,
}) => {
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
    [css.darkTheme]: darkTheme,
    [css.disabled]: disabled,
    [css.errorText]: isErrorText,
  });

  const noticeForControlsStyle = {
    ...((top !== NoticeForControls.defaultProps.top) && { top: `${top}px` }),
    ...((right !== NoticeForControls.defaultProps.right) && { right: `${right}px` }),
    ...((bottom !== NoticeForControls.defaultProps.bottom) && { bottom: `${bottom}px` }),
    ...((left !== NoticeForControls.defaultProps.left) && { left: `${left}px` }),
  };

  return (
    <span className={noticeForControlsClasses} style={noticeForControlsStyle}>
      {notice}
    </span>
  );
  //                                                                                  </editor-fold>
});

NoticeForControls.displayName = 'NoticeForControls';

NoticeForControls.propTypes = {
  top: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  right: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  bottom: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  left: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  darkTheme: PropTypes.bool,
  disabled: PropTypes.bool,
  notice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isErrorText: PropTypes.bool,
};

NoticeForControls.defaultProps = {
  top: 'auto',
  right: 'auto',
  bottom: 'auto',
  left: 'auto',
  darkTheme: false,
  disabled: false,
  notice: '',
  isErrorText: false,
};

export default NoticeForControls;
