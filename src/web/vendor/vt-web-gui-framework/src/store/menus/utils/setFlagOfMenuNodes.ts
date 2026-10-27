import type { MenuNodeId } from '../menus.types';
import type { PrimaryMenuState } from '../primaryMenu/primaryMenu.types';
import type { SecondaryMenuState } from '../secondaryMenu/secondaryMenu.types';


/**
 * Helper function to set a boolean flag of one or more menu nodes in the given state.
 *
 * @param state - The state whose element "menuNodes.byId" will be manipulated by this function.
 * @param ids - Array with the IDs of the menu nodes to manipulate its state.
 * @param flag - The name of an element of the menu node to manipulate. Only "hidden" and "disabled"
 *   are allowed at the moment.
 */
export const setFlagOfMenuNodes = (
  state: PrimaryMenuState | SecondaryMenuState,
  ids: MenuNodeId[],
  flag: 'isHidden' | 'isDisabled',
  value: boolean,
) => {
  ids
    .filter((id) => state.menuNodes.allIds.includes(id))
    .forEach((id) => {
      state.menuNodes.byId[id]![flag] = value;
    });
};
