import { systemSettings } from 'assets/defines';
import { pushLogEntry } from 'store/pushLogEntry';
import { getType, isNonEmptyString } from 'utils/type';

import type { AddMenuNode } from '../menus.types';
import type { PrimaryMenuNode, PrimaryMenuState } from '../primaryMenu/primaryMenu.types';
import type { SecondaryMenuState } from '../secondaryMenu/secondaryMenu.types';

import { parseContentPath } from './parseContentPath';
import { parseIcon } from './parseIcon';
import { parseMenuNodeId } from './parseMenuNodeId';
import { parseScope } from './parseScope';
import { parseUrlPathPart } from './parseUrlPathPart';


/**
 * Helper function to add given menu nodes to the given state object.
 *
 * @param state - The state whose elements "menuNodes.byId" and "menuNodes.allIds" will be
 *   manipulated by this function.
 * @param menuNodes - Array with the objects of the menu nodes to add to the state.
 * @param isSecondaryMenu - Set to true, if this function is used for the secondary menu.
 */
export const addAnyMenuNodes = (
  state: PrimaryMenuState | SecondaryMenuState,
  menuNodes: AddMenuNode[],
  isSecondaryMenu = false,
) => {
  const slice = isSecondaryMenu ? 'menus/secondaryMenu' : 'menus/primaryMenu';

  menuNodes.forEach(({
    id, parentMenuNodeId, insertBeforeId = '', caption = null, icon = null, isHidden, isDisabled,
    urlPathPart = null, scope, ignoreAppearance, contentPath = null, submenuNodes, options,
  }) => {
    const parsedId = parseMenuNodeId(id);
    let urlPath = parseUrlPathPart(urlPathPart);

    if (parsedId === null) {
      pushLogEntry(state.logs, {
        slice,
        level: 'error',
        timestamp: Date.now(),
        text: 'A menu node to add by the reducer has an empty or invalid field "id".',
      });
    } else if (state.menuNodes.allIds.includes(parsedId)) {
      pushLogEntry(state.logs, {
        slice,
        level: 'error',
        timestamp: Date.now(),
        text: `The ID "${parsedId}" of a menu node to add by the reducer is used for several menu nodes, but it has to be unique.`,
      });
    } else if (!isSecondaryMenu && !urlPath) {
      pushLogEntry(state.logs, {
        slice,
        level: 'error',
        timestamp: Date.now(),
        text: `The URL path of the menu node with ID "${parsedId}" to add by the reducer has invalid characters. Allowed: "A"-"Z", "a"-"z", "0"-"9", "-", "_", "." and "~".`,
      });
    } else {
      let level = 1,
        menuNodeTree = [parsedId];

      // -------------------------------------------------------------------------------------------
      // If a parent menu node is given, fit the level, the menu node tree and, in case of a primary
      // menu node, the url path.
      // -------------------------------------------------------------------------------------------

      if (parentMenuNodeId) {
        const parentMenuNode = state.menuNodes.byId[parentMenuNodeId] as PrimaryMenuNode | undefined;

        if (parentMenuNode) {
          level += parentMenuNode.level;
          menuNodeTree = [...parentMenuNode.menuNodeTree, ...menuNodeTree];

          if (!isSecondaryMenu) {
            urlPath = `${parentMenuNode.urlPath}${urlPath}`;
          }
        }
      }

      // -------------------------------------------------------------------------------------------
      // In case of a secondary menu node, determine if it is a special menu node.
      // -------------------------------------------------------------------------------------------

      const isSpecialMenuNode = (
        isSecondaryMenu
        && (level === 1)
        && Object.values(systemSettings.specialMenuNodeIds).includes(parsedId)
      );

      // -------------------------------------------------------------------------------------------
      // Check some further values and add the menu node to the collection.
      // -------------------------------------------------------------------------------------------

      const parsedIcon = parseIcon(icon, level, isSecondaryMenu);
      const parsedScope = parseScope(scope, isSecondaryMenu);

      if (!isSpecialMenuNode && !isNonEmptyString(caption)) {
        pushLogEntry(state.logs, {
          slice,
          level: 'error',
          timestamp: Date.now(),
          text: `The caption of the menu node with ID "${parsedId}" to add by the reducer is invalid or an empty string.`,
        });
      } else if (!isSpecialMenuNode && (parsedIcon === null)) {
        pushLogEntry(state.logs, {
          slice,
          level: 'error',
          timestamp: Date.now(),
          text: `The icon of the menu node with ID "${parsedId}" and of the ${(level === 1) ? '1st.' : '2nd.'} level to add by the reducer is invalid or an empty string.`,
        });
      } else {
        state.menuNodes.byId[parsedId] = {
          id: parsedId,
          caption,
          level,
          icon: parsedIcon,
          isHidden: (typeof isHidden === 'boolean') ? isHidden : false,
          isDisabled: (typeof isDisabled === 'boolean') ? isDisabled : false,
          contentPath: parseContentPath(contentPath, parsedScope) || '',
          menuNodeTree,
          submenuNodeIds: [] as string[],
          ...(isSecondaryMenu
            ? {
              isSpecialMenuNode,
              scope: parsedScope,
              ignoreAppearance: ((level === 1) && (typeof ignoreAppearance === 'boolean')) ? ignoreAppearance : false,
            }
            : {
              isStartpage: false,
              urlPath: urlPath!,
            }),
          options: (options && (getType(options) === 'object')) ? options : {},
        };

        if (level === 1) {
          // if this is a level 1 menu node, its position in allIds is important for the order of
          // the first level menu nodes

          const insertBeforeIdx = state.menuNodes.allIds.indexOf(insertBeforeId);

          if (insertBeforeIdx >= 0) {
            state.menuNodes.allIds.splice(insertBeforeIdx, 0, parsedId);
          } else {
            state.menuNodes.allIds.push(parsedId);
          }
        } else {
          // if this is not a level 1 menu node, insert its ID additionally to the submenu node IDs
          // of its parent menu node

          const parentId = menuNodeTree[menuNodeTree.length - 2]!;
          const insertBeforeIdx = state.menuNodes.byId[parentId]!.submenuNodeIds.indexOf(insertBeforeId);

          if (insertBeforeIdx >= 0) {
            state.menuNodes.byId[parentId]!.submenuNodeIds.splice(insertBeforeIdx, 0, parsedId);
          } else {
            state.menuNodes.byId[parentId]!.submenuNodeIds.push(parsedId);
          }

          state.menuNodes.allIds.push(parsedId);
        }

        // if there are submenu nodes, add them recusively
        if (Array.isArray(submenuNodes) && (submenuNodes.length > 0)) {
          addAnyMenuNodes(
            state,
            submenuNodes.map((submenuNode) => ({
              ...submenuNode,
              parentMenuNodeId: parsedId,
            })),
            isSecondaryMenu,
          );
        }
      }
    }
  });
};
