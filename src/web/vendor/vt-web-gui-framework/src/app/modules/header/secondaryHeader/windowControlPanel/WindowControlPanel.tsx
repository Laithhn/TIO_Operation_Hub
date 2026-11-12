import * as appSlice from 'app/app.slice';
import { WindowControlButton } from 'app/modules/windowControlButton';
import { useSelector } from 'components/hooks/useSelector';
import {
  closeApp, maximizeApp, minimizeApp, unmaximizeApp,
} from 'desktopApp';

import * as css from './windowControlPanel.scss';


/**
 *
 */
const WindowControlPanel = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const isDesktopAppMaximized = useSelector(appSlice.selectIsDesktopAppMaximized);


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
   * Handler for the callback prop "onClick" of the app module "WindowControlButton" to maximize /
   * unmaximize the app.
   */
  const handleClickMaximize: NonNullable<React.ComponentProps<typeof WindowControlButton>['onClick']> = () => {
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
      <WindowControlButton type="minimize" onClick={minimizeApp} />
      <WindowControlButton type={isDesktopAppMaximized ? 'unmaximize' : 'maximize'} onClick={handleClickMaximize} />
      <WindowControlButton type="close" onClick={closeApp} />
    </div>
  );
  //                                                                                  </editor-fold>
};

WindowControlPanel.displayName = 'WindowControlPanel';


export { WindowControlPanel };
