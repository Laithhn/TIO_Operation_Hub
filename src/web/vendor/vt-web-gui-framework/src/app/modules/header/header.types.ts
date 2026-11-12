/** The Redux state of the slice of the app module "Header". */
export interface HeaderState {
  /** Setting for the logo to show in the header: if false, no logo is displayed. If true, the
   * default VITRONIC logo is displayed. If a custom logo has to be shown, then this must be the
   * filename of the logo with a path inside the assets folder. Default: true. */
  logo: boolean | string;
  /** The title to show in the header. Default: empty string. */
  title: string;
}


/** The props of the React component of the app module "Header". */
export interface HeaderProps {
  readonly isMegaMenu: boolean;
  readonly isHamburgerMenu: boolean;
  readonly isHamburgerMenuVisible: boolean;
  readonly onToggleHamburgerMenu: () => void;
}
