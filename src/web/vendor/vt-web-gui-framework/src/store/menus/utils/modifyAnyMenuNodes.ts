import { isNonEmptyString } from 'utils/type';

import type { ModifyMenuNode } from '../menus.types';
import type { PrimaryMenuState } from '../primaryMenu/primaryMenu.types';
import type { SecondaryMenuState } from '../secondaryMenu/secondaryMenu.types';

import { parseIcon } from './parseIcon';


/**
 * Helper function to modify the caption or the icon of given menu nodes in the given state object.
 *
 * @param state - The state whose element "menuNodes.byId" will be manipulated by this function.
 * @param menuNodes - Each object in the array has to be included the ID of an existing
 *   menu node and the optional fields "caption" and / or "icon".
 * @param isSecondaryMenu - Set to true, if this function is used for the secondary menu.
 */
export const modifyAnyMenuNodes = (
  state: PrimaryMenuState | SecondaryMenuState,
  menuNodes: ModifyMenuNode[],
  isSecondaryMenu = false,
) => {
  menuNodes
    .filter(({ id }) => (
      state.menuNodes.allIds.includes(id)
      && !(state as SecondaryMenuState).menuNodes.byId[id]?.isSpecialMenuNode
    ))
    .forEach(({ id, caption = null, icon = null }) => {
      // caption
      if (isNonEmptyString(caption)) {
        state.menuNodes.byId[id]!.caption = caption;
      }

      // icon
      const parsedIcon = parseIcon(icon, state.menuNodes.byId[id]!.level, isSecondaryMenu);
      if (parsedIcon !== null) {
        state.menuNodes.byId[id]!.icon = parsedIcon;
      }
    });
};
