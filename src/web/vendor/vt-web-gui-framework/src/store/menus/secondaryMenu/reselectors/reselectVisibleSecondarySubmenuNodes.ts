import { createSelector } from '@reduxjs/toolkit';

import type { MenuNodeId } from '../../menus.types';
import type { SecondaryMenuState } from '../secondaryMenu.types';


export const reselectVisibleSecondarySubmenuNodes = createSelector(
  (state: SecondaryMenuState) => state.menuNodes.byId,
  (state: SecondaryMenuState, id: MenuNodeId) => state.menuNodes.byId[id],
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
