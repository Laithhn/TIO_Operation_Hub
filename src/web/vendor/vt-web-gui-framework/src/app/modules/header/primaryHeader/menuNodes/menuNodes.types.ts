import type { PrimaryMenuNode } from 'store/menus/primaryMenu';


export interface MenuNodesProps {
  readonly menuNodes: PrimaryMenuNode[];
  readonly isMegaMenu: boolean;
}
