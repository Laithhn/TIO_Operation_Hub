import type { MenuNodeId } from '../menus.types';
import type { PrimaryMenuNode, PrimaryMenuState } from '../primaryMenu/primaryMenu.types';
import type { SecondaryMenuNode, SecondaryMenuState } from '../secondaryMenu/secondaryMenu.types';


/**
 * Helper function to remove given menu nodes from the given state object.
 *
 * @param state - The state whose elements "menuNodes.byId" and "menuNodes.allIds" will be
 *   manipulated by this function.
 * @param ids - Array with the IDs of the menu nodes to remove from the state.
 */
export const removeAnyMenuNodes = (
  state: PrimaryMenuState | SecondaryMenuState,
  ids: MenuNodeId[],
) => {
  const { byId, allIds } = state.menuNodes;
  const nextById: Record<MenuNodeId, PrimaryMenuNode> | Record<MenuNodeId, SecondaryMenuNode> = {};

  const nextAllIds = allIds.filter((id) => {
    if (
      !ids.includes(id)
      && byId[id]?.menuNodeTree.every((parentId) => !ids.includes(parentId))
    ) {
      nextById[id] = {
        ...byId[id],
        submenuNodeIds: byId[id].submenuNodeIds.filter((childId) => !ids.includes(childId)),
      };

      return true;
    }

    return false;
  });

  if (nextAllIds.length !== allIds.length) {
    state.menuNodes.byId = nextById;
    state.menuNodes.allIds = nextAllIds;
  }
};
