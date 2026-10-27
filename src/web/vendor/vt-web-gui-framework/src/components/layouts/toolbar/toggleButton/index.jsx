import PropTypes from 'prop-types';
import { memo } from 'react';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import classNames from 'utils/classNames';

import css from './toggleButton.scss';


const dimPx = '26px';


/**
 * Memoized React component of a toggle button in the toolbar.
 */
const ToggleButton = memo(({
  icon, disabled, onClick,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { viewbox, getIconPath } = useIconsAsync();


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

  const toggleButtonClasses = classNames(css.toggleButton, {
    [css.typoDisabled]: disabled,
  });

  return (
    <svg
      role="button"
      aria-disabled={disabled}
      {...(!disabled && { onClick })}
      className={toggleButtonClasses}
      width={dimPx}
      height={dimPx}
      viewBox={viewbox}
    >
      <path d={getIconPath(icon)} />
    </svg>
  );
  //                                                                                  </editor-fold>
});

ToggleButton.displayName = 'ToggleButton';

ToggleButton.propTypes = {
  icon: PropTypes.string,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
};

ToggleButton.defaultProps = {
  icon: '',
  disabled: false,
  onClick: null,
};

export default ToggleButton;
