import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

import { getType, isNonEmptyStringOrNumber, isNumber } from 'utils/type';

import type { Modwin, ModwinsState } from './modwins.types';


const deleteElemInArr = (arr: string[], elem: string): void => {
  const idx = arr.indexOf(elem);
  if (idx >= 0) {
    arr.splice(idx, 1);
  }
};


const moveElemToTheEndOfArray = (arr: string[], elem: string): void => {
  const idx = arr.indexOf(elem);
  if ((idx >= 0) && (idx < (arr.length - 1))) {
    arr.push(arr.splice(idx, 1).pop()!);
  }
};


const initialState: ModwinsState = {
  byId: {},
  allIds: [],
  allMiniIds: [],
};


/**
 * Redux Toolkit slice that handles the partial state of the modal windows. This slice is exported
 * as default below.
 */
const slice = createSlice({
  name: 'VIWGF/modwins',
  reducerPath: 'modwins',
  initialState,

  reducers: {
    /**
     * Reducer to start the loading of a content into a modal window. This reducer can also be used,
     * to update (content data, title, width, height) an existing modwin with the same content path
     * as the given one, if the existing modwin is not marked as multiple or if it has the same
     * multiple-ID as the given one.
     */
    startLoadingContent: (state, { payload }: PayloadAction<Pick<Modwin, 'contentPath'> & Partial<Omit<Modwin, 'id' | 'isLoading' | 'contentPath' | 'isMinimized'>>>) => {
      const {
        contentPath, contentData, title, width, height,
      } = payload;
      const isContentDataGiven = (getType(contentData) === 'object');
      const isTitleGiven = (typeof title === 'string');
      const isWidthGiven = isNumber(width, { withoutInfinite: true, gte: 0 });
      const isHeightGiven = isNumber(height, { withoutInfinite: true, gte: 0 });
      const isResizable = !!payload.isResizable;
      const isDraggable = isResizable || !!payload.isDraggable;
      const isExclusive = !!payload.isExclusive;
      const isMinimizable = !isExclusive && !!payload.isMinimizable;
      const isUnclosable = !!payload.isUnclosable;
      const closeByEscape = !isUnclosable && !!payload.closeByEscape;
      const multiple = isNonEmptyStringOrNumber(payload.multiple) ? payload.multiple : !!payload.multiple;
      const dimmedBackground = isExclusive && !!payload.dimmedBackground;
      let updateId = '',
        pathAlreadyExists = false;

      // just update the existing modwin with the same content path as the new one, if the
      // existing one is not marked as multiple or if it has the same multiple-ID as the new one
      for (const id of state.allIds) {
        if (state.byId[id]?.contentPath === contentPath) {
          pathAlreadyExists = true;

          if (
            (state.byId[id].multiple === false)
            || (
              ((typeof state.byId[id].multiple === 'string') || (typeof state.byId[id].multiple === 'number'))
              && (state.byId[id].multiple === multiple)
            )
          ) {
            updateId = id;
            break;
          }
        }
      }

      if (updateId) {
        // 1/2: If a not-multiple modal window already exists with the given content path,
        // maximize it and push it into the foreground.
        if (isContentDataGiven) {
          state.byId[updateId]!.contentData = contentData!;
        }
        if (isTitleGiven) {
          state.byId[updateId]!.title = title;
        }
        if (isWidthGiven) {
          state.byId[updateId]!.width = width;
        }
        if (isHeightGiven) {
          state.byId[updateId]!.height = height;
        }

        state.byId[updateId]!.isMinimized = false;
        deleteElemInArr(state.allMiniIds, updateId);
        moveElemToTheEndOfArray(state.allIds, updateId);
      } else {
        // 2/2: Add a new modal window by the payload and append it on the top of the existing
        // ones.
        const id = nanoid();

        state.byId[id] = {
          id,
          isLoading: true,
          contentPath,
          contentData: isContentDataGiven ? contentData! : {},
          title: isTitleGiven ? title : '',
          width: isWidthGiven ? width : 0,
          height: isHeightGiven ? height : 0,
          isMinimized: false,
          isDraggable,
          isResizable,
          isMinimizable,
          isUnclosable,
          closeByEscape,
          multiple: (pathAlreadyExists && (multiple === false)) ? true : multiple,
          isExclusive,
          dimmedBackground,
        };
        state.allIds.push(id);
      }
    },


    /**
     * Reducer that indicates that the loading of a content into a modal window, selected by the
     * given ID, has been finished. For internal use of the framework only.
     */
    finishLoadingContent: (state, { payload }: PayloadAction<string>) => {
      if (state.byId[payload]) {
        state.byId[payload].isLoading = false;
      }
    },


    /**
     * Reducer to close and delete a modal window, selected by the given ID.
     */
    deleteModwin: (state, { payload }: PayloadAction<string>) => {
      if (state.byId[payload]) {
        deleteElemInArr(state.allIds, payload);
        deleteElemInArr(state.allMiniIds, payload);

        state.byId = state.allIds.reduce<ModwinsState['byId']>((acc, id) => ({
          ...acc,
          [id]: state.byId[id]!,
        }), {});
      }
    },


    /**
     * Reducer to close and delete all modal windows.
     */
    deleteAllModwins: (state) => {
      state.byId = {};
      state.allIds = [];
      state.allMiniIds = [];
    },


    /**
     * Reducer to change the title to show in the header of a modal window, selected by the given ID.
     */
    setTitle: (state, { payload: { id, title } }: PayloadAction<{ id: string; title: string }>) => {
      if (state.byId[id]) {
        state.byId[id].title = title;
      }
    },


    /**
     * Reducer to maximize a minimizable modal window, selected by the given ID.
     */
    maximize: (state, { payload }: PayloadAction<string>) => {
      if (state.byId[payload]?.isMinimizable && state.byId[payload].isMinimized) {
        state.byId[payload].isMinimized = false;
        moveElemToTheEndOfArray(state.allIds, payload);
        deleteElemInArr(state.allMiniIds, payload);
      }
    },


    /**
     * Reducer to minimize a minimizable modal window, selected by the given ID.
     */
    minimize: (state, { payload }: PayloadAction<string>) => {
      if (state.byId[payload]?.isMinimizable && !state.byId[payload].isMinimized) {
        state.byId[payload].isMinimized = true;
        state.allMiniIds.push(payload);
      }
    },


    /**
     * Reducer to move a modal window to the foreground, selected by the given ID.
     */
    moveToForeground: (state, { payload }: PayloadAction<string>) => {
      if (state.byId[payload] && !state.byId[payload].isMinimized) {
        moveElemToTheEndOfArray(state.allIds, payload);
      }
    },
  },


  selectors: {
    /**
     * Selector to return an array with the IDs of all modal windows.
     */
    selectAllIds: (state: ModwinsState) => state.allIds,


    /**
     * Selector to return an array with the IDs of all modal windows, that are minimized at the
     * moment.
     */
    selectIdsOfMinimizedModwins: (state: ModwinsState) => state.allMiniIds,


    /**
     * Selector to return the data object of a modal windows by a given ID. If this ID is invalid,
     * undefined is returned.
     */
    selectModwin: (state: ModwinsState, id: string) => state.byId[id],


    /**
     * Selector to return true, if a modal window selected by a given ID is minimized or false if
     * not. If the ID is invalid, false is returned.
     */
    selectIsMinimized: (state: ModwinsState, id: string) => state.byId[id]?.isMinimized ?? false,


    /**
     * Selector that returns true, if a modal window, selected by a given ID, is in the foreground.
     * Otherwise false is returned.
     */
    selectIsInTheForeground: (state: ModwinsState, id: string) => (state.allIds[state.allIds.length - 1] === id),
  },
});


export const { reducer, name, reducerPath } = slice;

export const {
  startLoadingContent, finishLoadingContent, deleteModwin, deleteAllModwins, setTitle, maximize,
  minimize, moveToForeground,
} = slice.actions;

export const {
  selectAllIds, selectIdsOfMinimizedModwins, selectModwin, selectIsMinimized,
  selectIsInTheForeground,
} = slice.selectors;
