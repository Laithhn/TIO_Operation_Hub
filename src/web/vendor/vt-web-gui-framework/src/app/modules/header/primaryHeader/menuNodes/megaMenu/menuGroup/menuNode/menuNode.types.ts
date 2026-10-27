import { type PrimaryMenuNode } from 'store/menus/primaryMenu';


export type InnerLinkProps = Pick<PrimaryMenuNode, 'caption' | 'level' | 'icon'>;


export interface MenuNodeProps {
  readonly menuNode: PrimaryMenuNode;
  readonly onClose: React.MouseEventHandler<HTMLAnchorElement>;
}
