import type { CheckBoxValue } from 'components/controls/checkBox';
import type { CardProps } from 'components/popups/card';

import type { Icons } from 'VtWebGuiIcons/src';


export type MenuItemId = string | number;


export interface MenuEntry {
  /** Each entry must have a unique ID in the form of a non-empty string or a number. */
  readonly id: MenuItemId;
  /** If you do not want the entry to be displayed in the menu, this option must be set to true. */
  readonly isHidden?: boolean;
  /** If the entry is to be displayed but disabled, this option must be set to true. */
  readonly isDisabled?: boolean;
  /** With this option, the translated text of the entry must be given. */
  readonly text: string | number;
  /** This option allows an icon to be displayed before the text of the entry. To do this, the valid
   * name of the icon must be provided. If the entry is a check box (see option "checkBoxValue"),
   * this option is ignored. */
  readonly icon?: Icons;
  /** This option allows an icon, a character string or a number to be displayed after the text of
   * the entry. If the valid name of an icon is given, the icon is displayed. However, if the entry
   * has a submenu (see option "subEntries"), this option is ignored and an arrow icon is displayed
   * instead. */
  readonly trailingIcon?: string | number;
  /** If this option is set to true, false or to "tickbox", a check box is displayed as entry.
   * However, if the entry has a submenu (see option "subEntries"), this option is ignored. */
  readonly checkBoxValue?: CheckBoxValue;
  /** This option allows you to give the entries of a submenu to the menu entry. These entries have
   * the same form as those of this menu entry. If a menu entry has a submenu, it will open when the
   * menu entry is clicked. The "onClick" callback function is not called in this case. */
  readonly subEntries?: MenuEntry[];
}


/** The props of the React component of the popup component "Menu". */
export type MenuProps = React.PropsWithChildren<{
  /** Optionally, an ID for the HTML attribute "id" of the card of the menu, written in every build
   * - for example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** This prop can be used to control the animated fade-in and fade-out of the menu, e.g., via the
   * useFadeInOut hook. If the prop is not set, the menu will fade in and out without animation
   * while mounting and unmounting. */
  readonly show?: NonNullable<CardProps['show']>;
  /** React reference (see React hook useRef) of an HTML element on which the menu is to be
   * positioned. It is automatically placed above or below the element, depending on where there is
   * more space to the respective edge of the browser window. The menu is aligned either to the
   * right or left of the reference element, depending on where there is more space available. For
   * lateral placement of the menu on the reference element, see Porp "placeBesideAnchorElem". */
  readonly anchorElemRef: NonNullable<CardProps['anchorElemRef']>;
  /** If this prop is set to true, it will automatically be placed to the right or left of the
   * reference element, depending on which side has more space to the respective edge of the browser
   * window. The card will be aligned flush with the top or bottom of the reference element,
   * depending on which side has more space available. */
  readonly placeBesideAnchorElem?: NonNullable<CardProps['placeBesideAnchorElem']>;
  /** If the number of entries on the top menu level exceeds the limit set by this prop, the display
   * mode of the menu changes: in this case, only the menu items of the top level can be displayed;
   * showing any submenu entries is not possible here. However, the number of top menu entries can
   * be as large as desired.  */
  readonly limitMenu?: number;
  /** This array contains the entries as objects to be displayed in the menu. If you want to display
   * dividing lines at any positions in the menu, you must enter null at the corresponding points in
   * the array. */
  readonly entries?: (MenuEntry | null)[];
  /** Callback function that is called as soon as a menu item is clicked. If the "disabled" option
   * is of a menu entry is set to true, this function is not called. This function is also not
   * called if a menu item has a submenu. */
  readonly onClick?: ({ menuItemId, event }: { menuItemId: MenuItemId; event: React.MouseEvent<HTMLSpanElement> | React.PointerEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement> }) => void;
  /** This callback function is called as soon as the card of the menu is to be closed by clicking
   * outside the menu or by pressing the Escape key. It is also called when the position of the
   * reference element (see prop "anchorElemRef") changes. */
  readonly onClose?: Required<CardProps>['onClickBeside'] | Required<CardProps>['onPressEscape'] | Required<CardProps>['onMoveAnchorElem'];
}>;
