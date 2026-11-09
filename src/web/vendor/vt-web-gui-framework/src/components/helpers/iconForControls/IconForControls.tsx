import { layout } from 'assets/styles';
import { Spinner } from 'components/indicators/spinner';
import { classNames } from 'utils/classNames';

import { getIconPath, iconExists, viewbox } from 'VtWebGuiIcons/src';

import * as css from './iconForControls.scss';
import type { IconForControlsProps } from './iconForControls.types';


const dimPx = `${layout.controls.iconDimDefault}px`;


/**
 * React component of the helper component "IconForControls" for icons used inside control elements.
 */
const IconForControls = ({
  disable = false, icon, showSpinner = false, onPointerDown, onClick,
}: IconForControlsProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isClickable = !disable && (!!onPointerDown || !!onClick);


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
      <Spinner alignSelf="center" dim={layout.controls.iconDimDefault} />
    );
  }


  if (!iconExists(icon ?? '')) {
    return null;
  }


  const iconForControlsClasses = classNames(css.iconForControls, {
    [css.typoDisabled]: disable,
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
      <path d={getIconPath(icon!)} />
    </svg>
  );
  //                                                                                  </editor-fold>
};

IconForControls.displayName = 'IconForControls';


export { IconForControls };
