import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { systemSettings } from 'assets/defines';
import { IS_DESKTOP_APP } from 'desktopApp';
import { StorageItf, StorageType } from 'interfaces/storageItf';
import { enhancedReducerCreator, startListening } from 'store';
import { isNumber } from 'utils/type';

import type { AppState, MenusAppearance } from './app.types';
import { createInitialState } from './utils/createInitialState';


const initialState: AppState = {
  menusAppearance: 'default',
  isHamburgerMenuVisible: false,
  isFirstSidebarEnabled: false,
  isSecondSidebarEnabled: false,
  isFooterEnabled: false,
  desktopApp: {
    isReady: false,
    width: systemSettings.desktopApp.defaultWidth,
    height: systemSettings.desktopApp.defaultHeight,
    minWidth: systemSettings.desktopApp.defaultMinWidth,
    minHeight: systemSettings.desktopApp.defaultMinHeight,
    isMaximized: false,
    isMinimized: false,
    storageType: StorageType.internal,
  },
  resp: {
    vWidth: 0,
    vHeight: 0,
  },
};


/**
 * Redux Toolkit slice that handles the partial state of the main app of VtWebGuiFramework.
 */
const slice = createSlice({
  name: 'VIWGF/app',
  reducerPath: 'app',
  initialState,

  reducers: {
    /**
     * Reducer to set the appearance of the menus. In any case hide the hamburger menu.
     */
    setMenusAppearance: (state, { payload }: PayloadAction<MenusAppearance | undefined>) => {
      state.menusAppearance = payload ?? 'default';
      state.isHamburgerMenuVisible = false;
    },


    /**
     * Reducer to toggle (show or hide) the hamburger menu.
     */
    toggleHamburgerMenu: (state) => {
      state.isHamburgerMenuVisible = (state.menusAppearance === 'hamburgerMenu')
        ? !state.isHamburgerMenuVisible
        : false;
    },


    /**
     * Reducer to hide the hamburger menu.
     */
    hideHamburgerMenu: (state) => {
      state.isHamburgerMenuVisible = false;
    },


    /**
     * Reduder to show (enable) the first sidebar.
     */
    enableFirstSidebar: (state) => {
      state.isFirstSidebarEnabled = true;
    },


    /**
     * Reduder to hide (disable) the first sidebar.
     */
    disableFirstSidebar: (state) => {
      state.isFirstSidebarEnabled = false;
    },


    /**
     * Reducer to show (enable) the second sidebar.
     */
    enableSecondSidebar: (state) => {
      state.isSecondSidebarEnabled = true;
    },


    /**
     * Reducer to hide (disable) the second sidebar.
     */
    disableSecondSidebar: (state) => {
      state.isSecondSidebarEnabled = false;
    },


    /**
     * Reducer to show (enable) the footer.
     */
    enableFooter: (state) => {
      state.isFooterEnabled = true;
    },


    /**
     * Reducer to hide (disable) the footer.
     */
    disableFooter: (state) => {
      state.isFooterEnabled = false;
    },


    /**
     * Reducer to initialize the desktop app (e.g. Electron) with the optional dimensions in pixels
     * (width and height) of it. The action creator of this reducer is dispatched in the initSlice
     * function automatically.
     */
    initDesktopApp: (state, { payload: { width, height } }: PayloadAction<{ width?: number; height?: number }>) => {
      if (!state.desktopApp.isReady) {
        if (isNumber(width, { withoutInfinite: true, gte: 0 })) {
          state.desktopApp.width = Math.max(state.desktopApp.minWidth, Math.round(width));
        }

        if (isNumber(height, { withoutInfinite: true, gte: 0 })) {
          state.desktopApp.height = Math.max(state.desktopApp.minHeight, Math.round(height));
        }
      }

      state.desktopApp.isReady = true;
    },


    /**
     * Reducer to set the width and the height (in pixels) of the desktop app (e.g. Electron). If
     * width and / or height are not given, the default width and height are taken instead (see the
     * system settings in /assets/defines).
     */
    setDesktopAppSize: (state, { payload: { width, height } }: PayloadAction<{ width?: number; height?: number }>) => {
      state.desktopApp.width = Math.max(
        state.desktopApp.minWidth,
        isNumber(width, { withoutInfinite: true, gte: 0 })
          ? Math.round(width)
          : systemSettings.desktopApp.defaultWidth,
      );

      state.desktopApp.height = Math.max(
        state.desktopApp.minHeight,
        isNumber(height, { withoutInfinite: true, gte: 0 })
          ? Math.round(height)
          : systemSettings.desktopApp.defaultHeight,
      );
    },


    /**
     * Reducer to maximize the window of the desktop app (e.g. Electron).
     */
    maximizeDesktopApp: (state) => {
      state.desktopApp.isMaximized = true;
      state.desktopApp.isMinimized = false;
    },


    /**
     * Reducer to minimize the window of the desktop app (e.g. Electron).
     */
    minimizeDesktopApp: (state) => {
      state.desktopApp.isMaximized = false;
      state.desktopApp.isMinimized = true;
    },


    /**
     * Reducer to set the window of the desktop app (e.g. Electron) as normal (not maximized nor
     * minimized).
     */
    setDesktopAppNormal: (state) => {
      state.desktopApp.isMaximized = false;
      state.desktopApp.isMinimized = false;
    },


    /**
     * Reducer to set the width and height of the viewport of the browser (in pixels). The action
     * creator of this reducer is dispatched in the initSlice function automatically.
     */
    setViewportDimensions: (state, { payload: { width, height } }: PayloadAction<{ width?: number; height?: number }>) => {
      if (isNumber(width, { withoutInfinite: true })) {
        state.resp.vWidth = Math.max(0, Math.round(width));
      }

      if (isNumber(height, { withoutInfinite: true })) {
        state.resp.vHeight = Math.max(0, Math.round(height));
      }
    },
  },


  selectors: {
    /**
     * Selector that returns true when the app is initialized and ready to use.
     */
    selectIsReady: (state: AppState) => (
      (!IS_DESKTOP_APP || state.desktopApp.isReady)
      && (state.resp.vWidth > 0)
      && (state.resp.vHeight > 0)
    ),


    /**
     * Selector to return the current appearance of the menus.
     */
    selectMenusAppearance: (state: AppState) => state.menusAppearance,


    /**
     * Selector to return true, if the hamburger menu is shown or false if not.
     */
    selectIsHamburgerMenuVisible: (state: AppState) => state.isHamburgerMenuVisible,


    /**
     * Selector that returns true when the first sidebar is visible (enabled).
     */
    selectIsFirstSidebarEnabled: (state: AppState) => state.isFirstSidebarEnabled,


    /**
     * Selector that returns true when the second sidebar is visible (enabled).
     */
    selectIsSecondSidebarEnabled: (state: AppState) => state.isSecondSidebarEnabled,


    /**
     * Selector that returns true when the footer is visible (enabled).
     */
    selectIsFooterEnabled: (state: AppState) => state.isFooterEnabled,


    /**
     * Selector to get the actual width in pixels of the window of the desktop app.
     */
    selectDesktopAppWidth: (state: AppState) => state.desktopApp.width,


    /**
     * Selector to get the actual height in pixels of the window of the desktop app.
     */
    selectDesktopAppHeight: (state: AppState) => state.desktopApp.height,


    /**
     * Selector to get the minimum width in pixels of the window of the desktop app.
     */
    selectDesktopAppMinWidth: (state: AppState) => state.desktopApp.minWidth,


    /**
     * Selector to get the minimum height in pixels of the window of the desktop app.
     */
    selectDesktopAppMinHeight: (state: AppState) => state.desktopApp.minHeight,


    /**
     * Selector that returns true if the window of the desktop app is maximized.
     */
    selectIsDesktopAppMaximized: (state: AppState) => state.desktopApp.isMaximized,


    /**
     * Selector that returns true if the window of the desktop app is minimized.
     */
    selectIsDesktopAppMinimized: (state: AppState) => state.desktopApp.isMinimized,


    /**
     * Selector that returns the storage type of the desktop app.
     */
    selectDesktopAppStorageType: (state: AppState) => state.desktopApp.storageType,


    /**
     * Selector to get the actual viewport width of the browser.
     */
    selectViewportWidth: (state: AppState) => state.resp.vWidth,


    /**
     * Selector to get the actual viewport height of the browser.
     */
    selectViewportHeight: (state: AppState) => state.resp.vHeight,
  },
});


if (IS_DESKTOP_APP) {
  // Redux middleware listener for changing the width and / or the height of the desktop app to
  // write these values into the storage.
  startListening({
    predicate: ({ type }, currentState, previousState) => (
      (
        (type === slice.actions.initDesktopApp.type)
        || (type === slice.actions.setDesktopAppSize.type)
      )
      && currentState.app.desktopApp.isReady
      && (
        (currentState.app.desktopApp.width !== previousState.app.desktopApp.width)
        || (currentState.app.desktopApp.height !== previousState.app.desktopApp.height)
      )
    ),
    effect: (_, listenerApi) => {
      const { width, height, storageType } = listenerApi.getState().app.desktopApp;

      const storage = new StorageItf<{ width: number; height: number }>(systemSettings.storage.reservedKeys['desktopApp']!, {
        hasSubValues: true,
        storageType,
        debounce: 3000,
      });

      storage.writeValue({ width, height });
    },
  });
}


export const reducer = enhancedReducerCreator<AppState>(slice, createInitialState);

export const { name, reducerPath } = slice;

export const {
  setMenusAppearance, toggleHamburgerMenu, hideHamburgerMenu, enableFirstSidebar,
  disableFirstSidebar, enableSecondSidebar, disableSecondSidebar, enableFooter, disableFooter,
  initDesktopApp, setDesktopAppSize, maximizeDesktopApp, minimizeDesktopApp, setDesktopAppNormal,
  setViewportDimensions,
} = slice.actions;

export const {
  selectIsReady, selectMenusAppearance, selectIsHamburgerMenuVisible, selectIsFirstSidebarEnabled,
  selectIsSecondSidebarEnabled, selectIsFooterEnabled, selectDesktopAppWidth,
  selectDesktopAppHeight, selectDesktopAppMinWidth, selectDesktopAppMinHeight,
  selectIsDesktopAppMaximized, selectIsDesktopAppMinimized, selectDesktopAppStorageType,
  selectViewportWidth, selectViewportHeight,
} = slice.selectors;
