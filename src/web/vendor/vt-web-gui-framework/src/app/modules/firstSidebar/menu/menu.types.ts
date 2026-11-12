import type { PrimaryMenuNode } from 'store/menus/primaryMenu';


export interface MenuProps {
  readonly menuNodes: PrimaryMenuNode[];
  readonly levelOfActiveMenuNode: number;
}
