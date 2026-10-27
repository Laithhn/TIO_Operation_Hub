export interface PrimaryHeaderProps {
  readonly isMegaMenu: boolean;
  readonly isHamburgerMenu: boolean;
  readonly isHamburgerMenuVisible: boolean;
  readonly title: string;
  readonly onToggleHamburgerMenu: () => void;
}
