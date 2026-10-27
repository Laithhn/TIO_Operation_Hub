import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { startLoadingContent, unloadContent } from 'app/modules/mainScope/mainScope.slice';
import { enhancedReducerCreator } from 'store/enhancedReducerCreator';
import { isNonEmptyString } from 'utils/type';

import type { AddMenuNode, MenuNodeId, ModifyMenuNode } from '../menus.types';
import { addAnyMenuNodes } from '../utils/addAnyMenuNodes';
import { modifyAnyMenuNodes } from '../utils/modifyAnyMenuNodes';
import { removeAnyMenuNodes } from '../utils/removeAnyMenuNodes';
import { setFlagOfMenuNodes } from '../utils/setFlagOfMenuNodes';

import type { PrimaryMenuNode, PrimaryMenuState } from './primaryMenu.types';
import { reselectEnabledPrimaryMenuNodeWithContentByUrlPath } from './reselectors/reselectEnabledPrimaryMenuNodeWithContentByUrlPath';
import { reselectVisiblePrimarySubmenuNodes } from './reselectors/reselectVisiblePrimarySubmenuNodes';
import { createInitialState } from './utils/createInitialState';


const reselectors: {
  enabledPrimaryMenuNodeWithContentByUrlPath?: Record<MenuNodeId, typeof reselectEnabledPrimaryMenuNodeWithContentByUrlPath>;
  visiblePrimarySubmenuNodes?: Record<MenuNodeId, typeof reselectVisiblePrimarySubmenuNodes>;
} = {};


const initialState: PrimaryMenuState = {
  menuNodes: {
    byId: {},
    allIds: [],
  },
  behaviorAtInvalidUrl: '_startpage',
  activeId: '',
  logs: [],
};


/**
 * Redux Toolkit slice that handles the partial state of the primary menu. This slice is exported as
 * default below.
 */
const slice = createSlice({
  name: 'VIWGF/primaryMenu',
  reducerPath: 'primaryMenu',
  initialState,

  reducers: {
    /**
     * Reducer to add one or multiple menu nodes to the primary menu.
     */
    addMenuNodes: (state, { payload: menuNodes }: PayloadAction<AddMenuNode | AddMenuNode[]>) => {
      addAnyMenuNodes(state, Array.isArray(menuNodes) ? menuNodes : [menuNodes]);
    },


    /**
     * Reducer to remove one or multiple menu nodes and all of their submenu nodes from the primary
     * menu.
     */
    removeMenuNodes: (state, { payload: menuNodeIds }: PayloadAction<MenuNodeId | MenuNodeId[]>) => {
      removeAnyMenuNodes(state, Array.isArray(menuNodeIds) ? menuNodeIds : [menuNodeIds]);
    },


    /**
     * Reducer to modify the caption or the icon of one or multiple menu nodes.
     */
    modifyMenuNodes: (state, { payload: menuNodes }: PayloadAction<ModifyMenuNode | ModifyMenuNode[]>) => {
      modifyAnyMenuNodes(state, Array.isArray(menuNodes) ? menuNodes : [menuNodes]);
    },


    /**
     * Reducer to show one or multiple primary menu nodes by the given menu node IDs.
     */
    showMenuNodes: (state, { payload: menuNodeIds }: PayloadAction<MenuNodeId | MenuNodeId[]>) => {
      setFlagOfMenuNodes(state, Array.isArray(menuNodeIds) ? menuNodeIds : [menuNodeIds], 'isHidden', false);
    },


    /**
     * Reducer to hide one or multiple primary menu nodes by the given menu node IDs.
     */
    hideMenuNodes: (state, { payload: menuNodeIds }: PayloadAction<MenuNodeId | MenuNodeId[]>) => {
      setFlagOfMenuNodes(state, Array.isArray(menuNodeIds) ? menuNodeIds : [menuNodeIds], 'isHidden', true);
    },


    /**
     * Reducer to enable one or multiple primary menu nodes by the given menu node IDs.
     */
    enableMenuNodes: (state, { payload: menuNodeIds }: PayloadAction<MenuNodeId | MenuNodeId[]>) => {
      setFlagOfMenuNodes(state, Array.isArray(menuNodeIds) ? menuNodeIds : [menuNodeIds], 'isDisabled', false);
    },


    /**
     * Reducer to disable one or multiple primary menu nodes by the given menu node IDs.
     */
    disableMenuNodes: (state, { payload: menuNodeIds }: PayloadAction<MenuNodeId | MenuNodeId[]>) => {
      setFlagOfMenuNodes(state, Array.isArray(menuNodeIds) ? menuNodeIds : [menuNodeIds], 'isDisabled', true);
    },
  },


  extraReducers: (builder) => {
    builder
      .addCase(startLoadingContent, (state, { payload }) => {
        state.activeId = isNonEmptyString(payload) && state.menuNodes.allIds.includes(payload) ? payload : '';
      })
      .addCase(unloadContent, (state) => {
        state.activeId = '';
      });
  },


  selectors: {
    /**
     * Selector to return the behavior that is to do, if a given URL is invalid (can not be found at
     * any primary menu node): "_startpage" (default) to show the content of a menu node marked as
     * startpage, "_blank" to show no content, "_error" to show an error content or a content path
     * to show this one.
     */
    selectBehaviorAtInvalidUrl: (state: PrimaryMenuState): string => state.behaviorAtInvalidUrl,


    /**
     * Selector to return an object of a menu node, selected by a given ID. If not found, null is
     * returned.
     */
    selectMenuNode: (state: PrimaryMenuState, id: MenuNodeId): PrimaryMenuNode | null => (state.menuNodes.byId[id] ?? null),


    /**
     * Selector to return true, if a menu node, selected by a given ID, exists and is neither hidden
     * nor disabled.
     */
    selectIsMenuNodeReachable: (state: PrimaryMenuState, id: MenuNodeId): boolean => {
      const { byId } = state.menuNodes;
      return byId[id]?.menuNodeTree.every((mnId) => (!byId[mnId]?.isHidden && !byId[mnId]?.isDisabled)) ?? false;
    },


    /**
     * Selector that returns true if there is an active menu node at the moment or false if not.
     */
    selectIsActiveMenuNode: (state: PrimaryMenuState): boolean => state.menuNodes.allIds.includes(state.activeId),


    /**
     * Selector to return true, if a menu node, selected by a given ID, is the currently active menu
     * node.
     */
    selectIsMenuNodeActive: (state: PrimaryMenuState, id: MenuNodeId): boolean => (id === state.activeId),


    /**
     * Selector to return true, if a menu node, selected by a given ID, is part of the menu tree of
     * the active menu node. If no menu node is set as active, false is returned.
     */
    selectIsIdPartOfActiveMenuTree: (state: PrimaryMenuState, id: MenuNodeId): boolean => {
      const menuNode = state.menuNodes.byId[state.activeId];
      return !!menuNode && menuNode.menuNodeTree.includes(id);
    },


    /**
     * Selector to return an object of the currently active menu node. If there is no active menu
     * node, null is returned.
     */
    selectActiveMenuNode: (state: PrimaryMenuState): PrimaryMenuNode | null => (state.menuNodes.byId[state.activeId] ?? null),


    /**
     * Selector to return a memoized array with the objects of all menu nodes of the 1st level
     * without the hidden ones. If there are no menu nodes, an empty array is returned.
     */
    selectMenuNodesOf1stLevel: createSelector(
      (state: PrimaryMenuState) => state.menuNodes.byId,
      (state: PrimaryMenuState) => state.menuNodes.allIds,
      (byId, allIds) => allIds
        .filter((id) => ((byId[id]?.level === 1) && !byId[id].isHidden))
        .map((id) => byId[id]!),
    ),


    /**
     * Selector to return a memoized array with the not hidden submenu nodes of a menu node,
     * selected by a given ID. Note that if the menu node or one of its parents are hidden or
     * disabled, an empty array is returned. If no ID is given, null is returned.
     */
    selectVisibleSubmenuNodes: (state: PrimaryMenuState, id: MenuNodeId): PrimaryMenuNode[] | null => {
      if (!id) {
        return null;
      }

      if (!reselectors.visiblePrimarySubmenuNodes?.[id]) {
        reselectors.visiblePrimarySubmenuNodes = {
          ...reselectors.visiblePrimarySubmenuNodes,
          [id]: reselectVisiblePrimarySubmenuNodes,
        };
      }

      return reselectors.visiblePrimarySubmenuNodes[id]!(state, id);
    },


    /**
     * Selector to return the memoized object of a not hidden and enabled menu node, that has a not
     * empty content file path, selected by a given url path. This search includes the menu node
     * with the given url path and all of its submenu nodes. The first not hidden and enabled one
     * with a not empty content file path that was found is returned. If no url path, "/" or a not
     * existing url path (the behavior at invalid URLs must be "_startpage" in this case) is given,
     * the menu nodes that are marked as startpage along with their submenu nodes are searched. If
     * no startpage can be found, all menu nodes are searches. If no not hidden and enabled menu
     * node with a not empty content file path can be found, null is returned.
     *
     * @param urlPath - The url path to find the menu node or submenu node with content.
     */
    selectEnabledMenuNodeWithContentByUrlPath: (state: PrimaryMenuState, urlPath?: string) => {
      const modUrlPath = urlPath ?? '/';

      if (!reselectors.enabledPrimaryMenuNodeWithContentByUrlPath?.[modUrlPath]) {
        reselectors.enabledPrimaryMenuNodeWithContentByUrlPath = {
          ...reselectors.enabledPrimaryMenuNodeWithContentByUrlPath,
          [modUrlPath]: reselectEnabledPrimaryMenuNodeWithContentByUrlPath,
        };
      }

      return reselectors.enabledPrimaryMenuNodeWithContentByUrlPath[modUrlPath]!(state, modUrlPath);
    },


    /**
     * Selector to return a memoized array with log entries occured in the menus/primaryMenu part of
     * the Redux store.
     */
    selectLogs: (state: PrimaryMenuState) => state.logs,
  },
});


export const reducer = enhancedReducerCreator<PrimaryMenuState>(slice, createInitialState);

export const { name, reducerPath } = slice;

export const {
  addMenuNodes, removeMenuNodes, modifyMenuNodes, showMenuNodes, hideMenuNodes, enableMenuNodes,
  disableMenuNodes,
} = slice.actions;

export const {
  selectBehaviorAtInvalidUrl, selectMenuNode, selectIsMenuNodeReachable, selectIsActiveMenuNode,
  selectIsMenuNodeActive, selectIsIdPartOfActiveMenuTree, selectActiveMenuNode,
  selectMenuNodesOf1stLevel, selectVisibleSubmenuNodes, selectEnabledMenuNodeWithContentByUrlPath,
  selectLogs,
} = slice.selectors;
