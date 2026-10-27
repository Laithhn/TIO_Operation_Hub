import type { MenuNodeId } from 'store/menus/primaryMenu';


export interface MegaMenuProps {
  readonly ref: React.Ref<HTMLDivElement>;
  readonly menuNodeId: MenuNodeId | null;
  readonly show: boolean;
  readonly onClose: React.MouseEventHandler<HTMLAnchorElement>;
}
