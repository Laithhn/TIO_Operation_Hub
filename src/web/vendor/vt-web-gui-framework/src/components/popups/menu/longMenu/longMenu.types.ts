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
  } | null>;
  allIds: MenuItemId[];
}


export interface LongMenuProps {
  readonly entries: (MenuEntry | null)[] | null;
  readonly limitMenu: number;
  readonly onClick?: ({ menuItemId, event }: { menuItemId: MenuItemId; event: React.MouseEvent<HTMLSpanElement> | React.PointerEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement> }) => void;
}
