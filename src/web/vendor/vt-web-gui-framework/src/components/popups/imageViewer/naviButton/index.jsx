import PropTypes from 'prop-types';
import { memo, useRef, useCallback } from 'react';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import Button, { ButtonType } from 'components/controls/button/index';
import useFadeInOut from 'components/hooks/useFadeInOut';
import classNames from 'utils/classNames';

import css from './naviButton.scss';


/**
 * Memoized React component of the navigation buttons to select the next or the previous image by
 * clicking.
 */
const NaviButton = memo(({
  pos, visible, isExpanded, onClick,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const buttonRef = useRef();


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

  /**
   *
   */
  const handleClick = useCallback((_, event) => {
    event.stopPropagation();

    if (visible) {
      onClick();
    }
  }, [visible, onClick]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  const { visibilityState } = useFadeInOut(visible, {
    fadeInTimeMs: defines.layout.defaultAnimationTimeMs,
    fadeOutTimeMs: defines.layout.defaultAnimationTimeMs,
  });


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (
    (visibilityState === Enums.Visibility.HIDE)
    || ((pos !== 'left') && (pos !== 'right'))
  ) {
    return null;
  }

  const naviButtonClasses = classNames(css.naviButton, {
    [css.left]: (pos === 'left'),
    [css.right]: (pos === 'right'),
    [css.visible]: ((visibilityState === Enums.Visibility.FADE_IN) || (visibilityState === Enums.Visibility.SHOW)),
    [css.isExpanded]: isExpanded,
  });

  return (
    <div
      className={naviButtonClasses}
      role="button"
      tabIndex={-1}
      onClick={(event) => handleClick(undefined, event)}
      onMouseMove={() => { buttonRef.current.focus(); }}
      onMouseLeave={() => { buttonRef.current.blur(); }}
    >
      <Button
        ref={buttonRef}
        type={ButtonType.ICON}
        large={!isExpanded}
        darkTheme
        icon={(pos === 'left') ? 'NAVILEFT' : 'NAVIRIGHT'}
        onClick={handleClick}
      />
    </div>
  );
  //                                                                                  </editor-fold>
});

NaviButton.displayName = 'NaviButton';

NaviButton.propTypes = {
  pos: PropTypes.oneOf(['left', 'right']).isRequired,
  visible: PropTypes.bool,
  isExpanded: PropTypes.bool,
  onClick: PropTypes.func,
};

NaviButton.defaultProps = {
  visible: false,
  isExpanded: false,
  onClick() {},
};

export default NaviButton;
