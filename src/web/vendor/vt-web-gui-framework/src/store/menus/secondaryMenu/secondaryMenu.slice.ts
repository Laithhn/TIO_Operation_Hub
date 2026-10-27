import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { enhancedReducerCreator } from 'store/enhancedReducerCreator';

import type { AddMenuNode, MenuNodeId, ModifyMenuNode } from '../menus.types';
import { addAnyMenuNodes } from '../utils/addAnyMenuNodes';
import { modifyAnyMenuNodes } from '../utils/modifyAnyMenuNodes';
import { removeAnyMenuNodes } from '../utils/removeAnyMenuNodes';
import { setFlagOfMenuNodes } from '../utils/setFlagOfMenuNodes';

import { reselectVisibleSecondarySubmenuNodes } from './reselectors/reselectVisibleSecondarySubmenuNodes';
import type { SecondaryMenuNode, SecondaryMenuState } from './secondaryMenu.types';
import { createInitialState } from './utils/createInitialState';


const reselectors: {
  visibleSecondarySubmenuNodes?: Record<MenuNodeId, typeof reselectVisibleSecondarySubmenuNodes>;
} = {};


const initialState: SecondaryMenuState = {
  menuNodes: {
    byId: {},
    allIds: [],
  },
  logs: [],
};


/**
 * Redux Toolkit slice that handles the partial state of the secondary menu. This slice is exported
 * as default below.
 */
const slice = createSlice({
  name: 'VIWGF/secondaryMenu',
  reducerPath: 'secondaryMenu',
  initialState,

  reducers: {
    /**
     * Reducer to add one or multiple menu nodes to the secondary menu.
     */
    addMenuNodes: (state, { payload: menuNodes }: PayloadAction<AddMenuNode | AddMenuNode[]>) => {
      addAnyMenuNodes(state, Array.isArray(menuNodes) ? menuNodes : [menuNodes], true);
    },


    /**
     * Reducer to remove one or multiple menu nodes and all of their submenu nodes from the
     * secondary menu.
     */
    removeMenuNodes: (state, { payload: menuNodeIds }: PayloadAction<MenuNodeId | MenuNodeId[]>) => {
      removeAnyMenuNodes(state, Array.isArray(menuNodeIds) ? menuNodeIds : [menuNodeIds]);
    },


    /**
     * Reducer to modify the caption or the icon of one or multiple menu nodes.
     */
    modifyMenuNodes: (state, { payload: menuNodes }: PayloadAction<ModifyMenuNode | ModifyMenuNode[]>) => {
      modifyAnyMenuNodes(state, Array.isArray(menuNodes) ? menuNodes : [menuNodes], true);
    },


    /**
     * Reducer to show one or multiple secondary menu nodes by the given menu node IDs.
     */
    showMenuNodes: (state, { payload: menuNodeIds }: PayloadAction<MenuNodeId | MenuNodeId[]>) => {
      setFlagOfMenuNodes(state, Array.isArray(menuNodeIds) ? menuNodeIds : [menuNodeIds], 'isHidden', false);
    },


    /**
     * Reducer to hide one or multiple secondary menu nodes by the given menu node IDs.
     */
    hideMenuNodes: (state, { payload: menuNodeIds }: PayloadAction<MenuNodeId | MenuNodeId[]>) => {
      setFlagOfMenuNodes(state, Array.isArray(menuNodeIds) ? menuNodeIds : [menuNodeIds], 'isHidden', true);
    },


    /**
     * Reducer to enable one or multiple secondary menu nodes by the given menu node IDs.
     */
    enableMenuNodes: (state, { payload: menuNodeIds }: PayloadAction<MenuNodeId | MenuNodeId[]>) => {
      setFlagOfMenuNodes(state, Array.isArray(menuNodeIds) ? menuNodeIds : [menuNodeIds], 'isDisabled', false);
    },


    /**
     * Reducer to disable one or multiple secondary menu nodes by the given menu node IDs.
     */
    disableMenuNodes: (state, { payload: menuNodeIds }: PayloadAction<MenuNodeId | MenuNodeId[]>) => {
      setFlagOfMenuNodes(state, Array.isArray(menuNodeIds) ? menuNodeIds : [menuNodeIds], 'isDisabled', true);
    },
  },


  selectors: {
    /**
     * Selector to return an object with the data objects of all secondary menu nodes. The keys are
     * the IDs of the secondary menu nodes.
     */
    selectAllMenuNodes: (state: SecondaryMenuState): SecondaryMenuState['menuNodes']['byId'] => state.menuNodes.byId,


    /**
     * Selector to return an object of a menu node, selected by a given ID. If not found, null is
     * returned.
     */
    selectMenuNode: (state: SecondaryMenuState, id: MenuNodeId): SecondaryMenuNode | null => (state.menuNodes.byId[id] ?? null),


    /**
     * Selector to return true, if a menu node, selected by a given ID, exists and is neither hidden
     * nor disabled.
     */
    selectIsMenuNodeReachable: (state: SecondaryMenuState, id: MenuNodeId): boolean => (
      (state.menuNodes.byId[id]?.isHidden === false) && !state.menuNodes.byId[id].isDisabled
    ),


    /**
     * Selector to return a memoized array with the objects of all menu nodes of the 1st level
     * without the hidden ones. If there are no menu nodes, an empty array is returned.
     */
    selectMenuNodesOf1stLevel: createSelector(
      (state: SecondaryMenuState) => state.menuNodes.byId,
      (state: SecondaryMenuState) => state.menuNodes.allIds,
      (byId, allIds) => allIds
        .filter((id) => ((byId[id]?.level === 1) && !byId[id].isHidden))
        .map((id) => byId[id]!),
    ),


    /**
     * Selector to return a memoized array with the not hidden submenu nodes of a menu node,
     * selected by a given ID. Note that if the menu node or one of its parents are hidden or
     * disabled, an empty array is returned. If no ID is given, null is returned.
     */
    selectVisibleSubmenuNodes: (state: SecondaryMenuState, id: MenuNodeId): SecondaryMenuNode[] | null => {
      if (!id) {
        return null;
      }

      if (!reselectors.visibleSecondarySubmenuNodes?.[id]) {
        reselectors.visibleSecondarySubmenuNodes = {
          ...reselectors.visibleSecondarySubmenuNodes,
          [id]: reselectVisibleSecondarySubmenuNodes,
        };
      }

      return reselectors.visibleSecondarySubmenuNodes[id]!(state, id);
    },


    /**
     * Selector to return a memoized array with log entries occured in the menus/secondaryMenu part
     * of the Redux store.
     */
    selectLogs: (state: SecondaryMenuState) => state.logs,
  },
});


export const reducer = enhancedReducerCreator<SecondaryMenuState>(slice, createInitialState);

export const { name, reducerPath } = slice;

export const {
  addMenuNodes, removeMenuNodes, modifyMenuNodes, showMenuNodes, hideMenuNodes, enableMenuNodes,
  disableMenuNodes,
} = slice.actions;

export const {
  selectAllMenuNodes, selectMenuNode, selectIsMenuNodeReachable, selectMenuNodesOf1stLevel,
  selectVisibleSubmenuNodes, selectLogs,
} = slice.selectors;
