import { createSelector } from '@reduxjs/toolkit';

import type { MenuNodeId } from '../../menus.types';
import type { PrimaryMenuNode, PrimaryMenuState } from '../primaryMenu.types';


/**
 * Helper function that iterates recursively over all submenu nodes of a menu node given by its ID
 * to return the ID of the first menu node found (inclusive the given one), that is not hidden, not
 * disabled and has a not empty content path. If nothing could be found, null is returned.
 *
 * @param byId - Part "byId" of the partial state of a menu node.
 * @param id - The ID of the menu node, to start searching.
 */
const searchIdOfEnabledMenuNodeWithContent = (
  byId: Record<MenuNodeId, PrimaryMenuNode>,
  id: MenuNodeId,
): MenuNodeId | null => {
  const menuNode = byId[id];
  let nextId: MenuNodeId | null = null;

  if (!menuNode) {
    return null;
  }

  const {
    isHidden, isDisabled, contentPath, submenuNodeIds,
  } = menuNode;

  if (isHidden || isDisabled) {
    return null;
  }

  if (contentPath === '') {
    for (const subId of submenuNodeIds) {
      nextId = searchIdOfEnabledMenuNodeWithContent(byId, subId);
      if (nextId !== null) {
        break;
      }
    }
  } else {
    nextId = id;
  }

  return nextId;
};


export const reselectEnabledPrimaryMenuNodeWithContentByUrlPath = createSelector(
  (state: PrimaryMenuState) => state.menuNodes.byId,
  (state: PrimaryMenuState) => state.menuNodes.allIds,
  (state: PrimaryMenuState) => state.behaviorAtInvalidUrl,
  (_: PrimaryMenuState, urlPath: string) => urlPath,
  (byId, allIds, behaviorAtInvalidUrl, urlPath) => {
    // ---------------------------------------------------------------------------------------------
    // Try to find a menu node with the given url path.
    // ---------------------------------------------------------------------------------------------

    let id = allIds.find((mnId) => (byId[mnId]?.urlPath === urlPath)) ?? null;

    if (id) {
      let enabledMenuNodeId = null;

      // If a menu node was found but if it or one of its parents is hidden or disabled, take the
      // nearest visible parent menu node that has an own content.
      for (const mnId of byId[id]?.menuNodeTree ?? []) {
        if (!byId[mnId]?.isHidden && !byId[mnId]?.isDisabled) {
          if ((mnId === id) || (byId[mnId]?.contentPath !== '')) {
            enabledMenuNodeId = mnId;
          }
        } else {
          break;
        }
      }

      // If all parents are visible, search for the next menu node (inclusive this one) that has an
      // own content (and is not hidden and not disabled).
      id = (enabledMenuNodeId === id)
        ? searchIdOfEnabledMenuNodeWithContent(byId, id)
        : enabledMenuNodeId;
    }

    if (
      !id
      && ((urlPath === '/') || (behaviorAtInvalidUrl === '_startpage'))
    ) {
      // -------------------------------------------------------------------------------------------
      // If no menu node was found by the given url path, try to find a menu node that is marked as
      // startpage.
      // -------------------------------------------------------------------------------------------

      const startpageIds = allIds.filter((mnId) => byId[mnId]?.isStartpage);

      // Take the first of all startpage menu nodes that neither is hidden or disabled nor its
      // parents.
      for (const startpageId of startpageIds) {
        if (!byId[startpageId]?.menuNodeTree.some((mnId) => (byId[mnId]?.isHidden) || byId[mnId]?.isDisabled)) {
          id = searchIdOfEnabledMenuNodeWithContent(byId, startpageId);
        }
        if (id) {
          break;
        }
      }

      // If no visible startpage menu node was found, search one of their parents that has an own
      // content and is visible.
      if (!id) {
        for (const startpageId of startpageIds) {
          for (const mnId of byId[startpageId]?.menuNodeTree ?? []) {
            if ((mnId !== startpageId) && !byId[mnId]?.isHidden && !byId[mnId]?.isDisabled) {
              if (byId[mnId]?.contentPath !== '') {
                id = mnId;
              }
            } else {
              break;
            }
          }

          if (id) {
            break;
          }
        }
      }

      // -------------------------------------------------------------------------------------------
      // If still no menu node was found, start searching for a visible node at the first menu node
      // level.
      // -------------------------------------------------------------------------------------------

      if (!id) {
        for (const mnId2 of allIds.filter((mnId) => byId[mnId]?.level === 1)) {
          id = searchIdOfEnabledMenuNodeWithContent(byId, mnId2);

          if (id) {
            break;
          }
        }
      }
    }

    return id ? byId[id]! : null;
  },
);
