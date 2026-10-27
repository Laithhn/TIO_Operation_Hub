import { classNames } from 'utils/classNames';

import { getIconPath, viewbox } from 'VtWebGuiIcons/src';

import * as css from './toggleButton.scss';
import type { ToggleButtonProps } from './toggleButton.types';


const dimPx = '26px';


/**
 * React sub-component of a toggle button used in the layout component "Toolbar".
 */
const ToggleButton = ({ icon, disable, onClick }: ToggleButtonProps) => {
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

  const toggleButtonClasses = classNames(css.toggleButton, {
    [css.typoDisabled]: disable,
  });

  return (
    <svg
      role="button"
      aria-disabled={disable}
      {...(!disable && { onClick })}
      className={toggleButtonClasses}
      width={dimPx}
      height={dimPx}
      viewBox={viewbox}
    >
      <path d={getIconPath(icon)} />
    </svg>
  );
  //                                                                                  </editor-fold>
};

ToggleButton.displayName = 'ToggleButton';


export { ToggleButton };
