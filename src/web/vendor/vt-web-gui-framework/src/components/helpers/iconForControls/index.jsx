import PropTypes from 'prop-types';
import { memo } from 'react';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import Spinner from 'components/helpers/spinner';
import classNames from 'utils/classNames';

import css from './iconForControls.scss';


const dimPx = `${defines.layout.controls.iconDimDefault}px`;


/**
 * Memoized React component of an icon used inside several control elements.
 */
const IconForControls = memo(({
  darkTheme, disabled, icon, showSpinner, onPointerDown, onClick,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { viewbox, iconExists, getIconPath } = useIconsAsync();

  const isClickable = !disabled && !!(onPointerDown || onClick);


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

  if (showSpinner) {
    return (
      <Spinner
        alignSelf={Enums.PlaceSelfItems.CENTER}
        dim={defines.layout.controls.iconDimDefault}
        darkTheme={darkTheme}
      />
    );
  }


  if (!iconExists(icon)) {
    return null;
  }


  const iconForControlsClasses = classNames(css.iconForControls, {
    [css.typoDarkTheme]: darkTheme,
    [css.typoDisabled]: disabled,
    [css.clickable]: isClickable,
  });

  return (
    <svg
      {...(isClickable && {
        role: 'button',
        ...(onPointerDown && { onPointerDown }),
        ...(onClick && { onClick }),
      })}
      className={iconForControlsClasses}
      width={dimPx}
      height={dimPx}
      viewBox={viewbox}
    >
      <path d={getIconPath(icon)} />
    </svg>
  );
  //                                                                                  </editor-fold>
});

IconForControls.displayName = 'IconForControls';

IconForControls.propTypes = {
  darkTheme: PropTypes.bool,
  disabled: PropTypes.bool,
  icon: PropTypes.string,
  showSpinner: PropTypes.bool,
  onPointerDown: PropTypes.func,
  onClick: PropTypes.func,
};

IconForControls.defaultProps = {
  darkTheme: false,
  disabled: false,
  icon: '',
  showSpinner: false,
  onPointerDown: null,
  onClick: null,
};

export default IconForControls;
