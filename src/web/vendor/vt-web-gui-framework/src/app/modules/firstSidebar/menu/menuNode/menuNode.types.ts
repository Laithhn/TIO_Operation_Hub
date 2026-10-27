import type { PrimaryMenuNode } from 'store/menus/primaryMenu';


export interface MenuNodeProps {
  readonly menuNode: PrimaryMenuNode;
  readonly onSetHeight: (id: PrimaryMenuNode['id'], height: number) => void;
  readonly onActive: (id: PrimaryMenuNode['id'], offset: number) => void;
}
