import { Enumify } from 'utils/enumify';


/**
 * Exported enum for the window state of the desktop app. All enumeration values have the default
 * elements "name" and "ordinal".
 *
 * @property {object} MAXIMIZED - The window of the desktop app is maximized.
 * @property {object} MINIMIZED - The window of the desktop app is minimized.
 * @property {object} NORMAL - The window of the desktop app is normal, not maximized nor minimized.
 * @property {function} enumValues - Return an array with all enum objects.
 */
export class DesktopAppStatus extends Enumify {
  static MAXIMIZED = new DesktopAppStatus();
  static MINIMIZED = new DesktopAppStatus();
  static NORMAL = new DesktopAppStatus();
  static _ = this.closeEnum();
}


const IS_ELECTRON = (process.env.DESKTOP_APP === 'electron');
export const IS_DESKTOP_APP = IS_ELECTRON;


let ipcRenderer,
  isInit = false;

if (IS_ELECTRON) {
  ({ ipcRenderer } = window.require('electron'));
}


/**
 * Exported function to set the position of the window of the desktop app.
 */
export const moveApp = (dx, dy) => {
  ipcRenderer.send('move-window', { dx, dy });
};


/**
 * Exported function to maximize the window of the desktop app.
 */
export const maximizeApp = () => {
  if (IS_ELECTRON) {
    ipcRenderer.send('maximize-window');
  }
};


/**
 * Exported function to unmaximize the window of the desktop app.
 */
export const unmaximizeApp = () => {
  if (IS_ELECTRON) {
    ipcRenderer.send('unmaximize-window');
  }
};


/**
 * Exported function to minimize the window of the desktop app.
 */
export const minimizeApp = () => {
  if (IS_ELECTRON) {
    ipcRenderer.send('minimize-window');
  }
};


/**
 * Exported function to close the desktop app.
 */
export const closeApp = () => {
  if (IS_ELECTRON) {
    ipcRenderer.send('close-app');
  }
};


/**
 * Exported function to open an external link by a given url in the default browser.
 *
 * @param {string | function} url
 */
export const openExternalLink = (url) => {
  if (IS_ELECTRON) {
    ipcRenderer.send('open-external-link', url);
  }
};


/**
 * Exported function to initialize the desktop app.
 *
 * @param {number} [width=800] - The initial width of the window of the desktop app.
 * @param {number} [height=600] - The initial height of the window of the desktop app.
 * @param {number} [minWidth=0] - The minimum width of the window of the desktop app.
 * @param {number} [minHeight=0] - The minimum height of the window of the desktop app.
 * @param {function} onAppStateChange - Callback function that is invoked if the state of the
 *   window of the desktop app changes.
 * @param {function} onAppResize - Callback function that is invoked if the desktop app is resized.
 */
export const initDesktopApp = ({
  width = 800,
  height = 600,
  minWidth = 0,
  minHeight = 0,
  onAppStateChange,
  onAppResize,
}) => {
  if (isInit) {
    throw new Error('VIWGF > DesktopApp > initDesktopApp(): the desktop app has already been initialized, this can only be done once.');
  }

  if (IS_ELECTRON) {
    ipcRenderer.on('appStateChange', (event, status) => {
      switch (status) {
        case 'maximized': onAppStateChange(DesktopAppStatus.MAXIMIZED); break;
        case 'minimized': onAppStateChange(DesktopAppStatus.MINIMIZED); break;
        default: onAppStateChange(DesktopAppStatus.NORMAL); break;
      }
    });

    ipcRenderer.on('appResize', (event, widthAndHeight) => {
      onAppResize(widthAndHeight);
    });

    ipcRenderer.send('set-window-minimum-size', { width: minWidth, height: minHeight });
    ipcRenderer.send('set-window-size', { width, height, center: true });
    ipcRenderer.send('show-app');
  }

  isInit = true;
};
