import { type PrimaryMenuNode } from 'store/menus/primaryMenu';


export interface MenuGroupProps {
  readonly menuNode: PrimaryMenuNode;
  readonly onClose: React.MouseEventHandler<HTMLAnchorElement>;
}
