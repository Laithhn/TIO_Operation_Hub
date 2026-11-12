import { createSelector } from '@reduxjs/toolkit';

import type { MenuNodeId } from '../../menus.types';
import type { PrimaryMenuState } from '../primaryMenu.types';


export const reselectVisiblePrimarySubmenuNodes = createSelector(
  (state: PrimaryMenuState) => state.menuNodes.byId,
  (state: PrimaryMenuState, id: MenuNodeId) => state.menuNodes.byId[id],
  (byId, menuNode) => {
    if (
      !menuNode
      || menuNode.menuNodeTree.some((mnId) => (byId[mnId]?.isHidden || byId[mnId]?.isDisabled))
    ) {
      return null;
    }

    return menuNode.submenuNodeIds.filter((mnId) => !byId[mnId]?.isHidden).map((mnId) => byId[mnId]!);
  },
);
