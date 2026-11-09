import type { layout } from 'assets/styles';
import type { StorageType } from 'interfaces/storageItf';


/** Enumeration of where and how the primary and secondary menu items are displayed: By "default",
 * the menus are shown in a classic style with menu entries in the header and in the first sidebar.
 * With "megaMenu", all primary submenu items are completely shown in a drop down menu instead of
 * inside the first sidebar. The secondary menu items are shown in the header as at "default". With
 * With "hamburgerMenu, the complete menus are shown as a typical hamburger menu with a hamburger
 * menu icon in the header. */
export type MenusAppearance = 'default' | 'megaMenu' | 'hamburgerMenu';


export type GridTemplateAreaMatrix = (
  (keyof Pick<typeof layout, 'header' | 'burgerMenu' | 'firstSidebar' | 'secondSidebar' | 'mainScope' | 'notifications' | 'footer'>)
  | '.'
)[][];


/** The Redux state of the slice "app", the main app of VtWebGuiFramework. */
export interface AppState {
  /** The kind of showing the primary and secondary menu: as hamburger menu, as mega menu, partially
   * or completaly in the header and partially in the first sidebar. */
  menusAppearance: MenusAppearance;
  /** True, if the hamburger menu is shown or false if not. */
  isHamburgerMenuVisible: boolean;
  /** True, if the first sidebar is enabled (is shown) or false if not. */
  isFirstSidebarEnabled: boolean;
  /** True, if the second sidebar is enabled (is shown) or false if not. */
  isSecondSidebarEnabled: boolean;
  /** True, if the footer is enabled (is shown) or false if not. */
  isFooterEnabled: boolean;
  /** Settings for the use of VtWebGuiFramework as desktop app. */
  desktopApp: {
    /** True, if the desktop app is initialized and ready to use. Default: false. */
    isReady: boolean;
    /** The current width of the desktiop app. Default: see system settings in /assets/defines. */
    width: number;
    /** The current height of the desktiop app. Default: see system settings in /assets/defines. */
    height: number;
    /** The minimum possible width of the desktiop app. Default: see system settings in
     * /assets/defines. */
    minWidth: number;
    /** The minimum possible height of the desktiop app. Default: see system settings in
     * /assets/defines. */
    minHeight: number;
    /** True, if the desktop app is maximized. Default: false. */
    isMaximized: boolean;
    /** True, if the desktop app is minimized. Default: false. */
    isMinimized: boolean;
    /** The storage type to store the current width and height of the desktop app. Default:
     * INTERNAL. */
    storageType: StorageType;
  };
  /** Values for responsibility. */
  resp: {
    /** The actual viewport width of the browser window. */
    vWidth: number;
    /** The actual viewport height of the browser window. */
    vHeight: number;
  };
}
