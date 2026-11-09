import type { CardAnchorElem } from 'components/popups/card';

import type { MenuEntry, MenuItemId } from '../menu.types';


export interface ModEntries {
  byId: Record<MenuItemId, {
    id: MenuEntry['id'];
    group: number;
    isDisabled: NonNullable<MenuEntry['isDisabled']>;
    text: MenuEntry['text'];
    icon: NonNullable<MenuEntry['icon']> | undefined;
    trailingIcon: NonNullable<MenuEntry['trailingIcon']> | undefined;
    checkBoxValue: NonNullable<MenuEntry['checkBoxValue']> | undefined;
    subEntries: [MenuEntry, ...MenuEntry[]] | undefined;
  } | null>;
  allIds: MenuItemId[];
}


export interface DeepMenuProps {
  readonly entries: (MenuEntry | null)[] | null;
  /** Set on every level but the first: the anchor the level's own card is placed beside, the item
   * of the parent level that opened it, grown by the level's padding (see DeepMenu.tsx). */
  readonly anchorRef?: React.RefObject<CardAnchorElem | null>;
  readonly onClick?: ({ menuItemId, event }: { menuItemId: MenuItemId; event: React.MouseEvent<HTMLSpanElement> | React.PointerEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement> }) => void;
}
