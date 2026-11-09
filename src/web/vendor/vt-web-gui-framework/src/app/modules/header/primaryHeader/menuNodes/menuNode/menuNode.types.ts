import type { MenuNodeId, PrimaryMenuNode } from 'store/menus/primaryMenu';


export interface MenuNodeProps {
  readonly menuNode: PrimaryMenuNode;
  readonly suppressNavigationIfActive: boolean;
  readonly onActive: ({ menuNodeId, relPosX, width }: { menuNodeId: MenuNodeId; relPosX: number; width: number }) => void;
  readonly onClick?: ({ menuNodeId }: { menuNodeId: MenuNodeId }) => void;
}
