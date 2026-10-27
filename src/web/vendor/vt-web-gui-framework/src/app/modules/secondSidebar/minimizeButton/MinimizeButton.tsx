import { layout } from 'assets/styles';
import { useDispatch } from 'components/hooks/useDispatch';
import { classNames } from 'utils/classNames';

import { getIconPath, viewbox } from 'VtWebGuiIcons/src';

import { maximize, minimize } from '../secondSidebar.slice';

import * as css from './minimizeButton.scss';
import type { MinimizeButtonProps } from './minimizeButton.types';


/**
 * React sub-component of the minimize / maximize button of the app module "SecondSidebar".
 */
const MinimizeButton = ({ isRtl, isMinimized }: MinimizeButtonProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const svgDimPx = `${layout.controls.iconDimDefault}px`;
  const icon = getIconPath(isRtl ? 'NAVILEFTFAST' : 'NAVIRIGHTFAST');


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const handleClick = () => {
    if (isMinimized) {
      dispatch(maximize());
    } else {
      dispatch(minimize());
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const minimizeButtonClasses = classNames(css.minimizeButton, {
    [css.isMinimized]: isMinimized,
  });

  return (
    <button
      type="button"
      className={minimizeButtonClasses}
      onClick={handleClick}
    >
      {icon && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <svg width={svgDimPx} height={svgDimPx} viewBox={viewbox}>
          <path d={icon} />
        </svg>
      )}
    </button>
  );
  //                                                                                  </editor-fold>
};

MinimizeButton.displayName = 'MinimizeButton';


export { MinimizeButton };
