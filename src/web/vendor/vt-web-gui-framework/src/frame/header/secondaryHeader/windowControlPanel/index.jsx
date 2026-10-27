import { useSelector } from 'react-redux';

import {
  maximizeApp, unmaximizeApp, minimizeApp, closeApp,
} from 'desktopApp';
import WindowControlButton, { WindowControlButtonType } from 'frame/windowControlButton';
import { selectors } from 'store';

import css from './windowControlPanel.scss';


/**
 * React component of the window control panel, used for Electron builds. This component renders the
 * control buttons to minimize, to maximize / unmaximize and to close the window.
 */
const WindowControlPanel = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const isDesktopAppMaximized = useSelector(selectors.app.isDesktopAppMaximized);


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
   * Handler for event "click" on the maximize / unmaximize button.
   */
  const handleClickMaximize = () => {
    if (isDesktopAppMaximized) {
      unmaximizeApp();
    } else {
      maximizeApp();
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

  return (
    <div className={css.windowControlPanel}>
      <WindowControlButton
        type={WindowControlButtonType.MINIMIZE}
        onClick={minimizeApp}
      />
      <WindowControlButton
        type={isDesktopAppMaximized ? WindowControlButtonType.UNMAXIMIZE : WindowControlButtonType.MAXIMIZE}
        onClick={handleClickMaximize}
      />
      <WindowControlButton
        type={WindowControlButtonType.CLOSE}
        onClick={closeApp}
      />
    </div>
  );
  //                                                                                  </editor-fold>
};

WindowControlPanel.displayName = 'WindowControlPanel';

export default WindowControlPanel;
