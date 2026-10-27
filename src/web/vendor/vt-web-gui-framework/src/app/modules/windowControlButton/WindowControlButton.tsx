import { useInteractions } from 'components/hooks/useInteractions';
import { iconSize } from 'components/indicators/icon';
import { classNames } from 'utils/classNames';

import { getIconPath, viewbox } from 'VtWebGuiIcons/src';

import * as css from './windowControlButton.scss';
import type { WindowControlButtonProps } from './windowControlButton.types';


/**
 * React component of the app module "WindowControlButton".
 */
const WindowControlButton = ({ type, onClick }: WindowControlButtonProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const sizePx = `${iconSize.small}px`;
  let path;

  switch (type) {
    case 'minimize': path = getIconPath('WINDOWMINIMIZE'); break;
    case 'maximize': path = getIconPath('WINDOWMAXIMIZE'); break;
    case 'unmaximize': path = getIconPath('WINDOWUNMAXIMIZE'); break;
    case 'close': path = getIconPath('WINDOWCLOSE'); break;
    default: path = getIconPath('WINDOW'); break;
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const { interactionProps, isPressed } = useInteractions<HTMLSpanElement>({
    enablePointer: true,
    enableKeyboard: true,
    tabIndex: -1,
    ...(onClick && { onClick }),
  });


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const windowControlButtonClasses = classNames(css.windowControlButton, {
    [css.pressed]: isPressed,
  });

  return (
    <span
      role="button"
      className={windowControlButtonClasses}
      {...interactionProps}
    >
      {!!path && (
        <svg width={sizePx} height={sizePx} viewBox={viewbox}>
          <path d={path} />
        </svg>
      )}
    </span>
  );
  //                                                                                  </editor-fold>
};

WindowControlButton.displayName = 'WindowControlButton';


export { WindowControlButton };
