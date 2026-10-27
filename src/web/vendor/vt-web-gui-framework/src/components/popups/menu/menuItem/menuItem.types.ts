import type { CheckBoxValue } from 'components/controls/checkBox';

import type { Icons } from 'VtWebGuiIcons/src';

import type { MenuItemId } from '../menu.types';


export interface MenuItemProps {
  readonly ref?: React.Ref<HTMLSpanElement>;
  readonly id: MenuItemId;
  readonly disable: boolean;
  readonly highlight: boolean;
  readonly text: string | number;
  readonly leadingIcon: Icons | undefined;
  readonly trailingIcon: string | number | undefined;
  readonly checkBoxValue: CheckBoxValue | undefined;
  readonly onClick: ({ id, event }: { id: MenuItemId; event: React.MouseEvent<HTMLSpanElement> | React.PointerEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement> }) => void;
}
