import { createSlice, type PayloadAction, type WithSlice } from '@reduxjs/toolkit';

import { layout } from 'assets/styles';
import { StorageType } from 'interfaces/storageItf';
import { enhancedReducerCreator, type RootState } from 'store';
import { rootReducer } from 'store/rootReducer';
import { isNumber } from 'utils/type';

import type { SecondSidebarState } from './secondSidebar.types';
import { createInitialState } from './utils/createInitialState';


const initialState: SecondSidebarState = {
  isReady: false,
  width: layout.secondSidebar.defaultWidth,
  isMinimizable: false,
  isMinimized: false,
  isResizable: false,
  storageType: StorageType.internal,
  content: {
    path: '',
  },
};


/**
 * Redux Toolkit slice that handles the partial state of the second sidebar. This slice is exported
 * as default below.
 */
const slice = createSlice({
  name: 'VIWGF/secondSidebar',
  reducerPath: 'secondSidebar',
  initialState,


  reducers: {
    /**
     * Reducer to initially set the width and flag "minimized" of the second sidebar, if given and
     * end the initialization phase of this slice. The action creator of this reducer is dispatched
     * in the initSlice function.
     */
    init: (state, { payload: { width, isMinimized } }: PayloadAction<{ width?: unknown; isMinimized?: unknown }>) => {
      if (!state.isReady) {
        if (isNumber(width, { withoutInfinite: true, gte: 0 })) {
          state.width = Math.round(width);
        }

        if (typeof isMinimized === 'boolean') {
          state.isMinimized = isMinimized;
        }
      }

      state.isReady = true;
    },


    /**
     * Reducer to configure the second sidebar.
     */
    configure: (state, { payload }: PayloadAction<Partial<Omit<SecondSidebarState, 'storageType' | 'content'> & {
      /** Optionally set the content path for the content area of the second sidenbar. */
      contentPath: string;
    }>>) => {
      if (isNumber(payload.width, { withoutInfinite: true })) {
        state.width = Math.max(0, Math.round(payload.width));
      }

      if (typeof payload.isMinimizable === 'boolean') {
        state.isMinimizable = payload.isMinimizable;
      }

      if (state.isMinimizable) {
        if (typeof payload.isMinimized === 'boolean') {
          state.isMinimized = payload.isMinimized;
        }
      } else {
        state.isMinimized = false;
      }

      if (typeof payload.isResizable === 'boolean') {
        state.isResizable = payload.isResizable;
      }

      if (typeof payload.contentPath === 'string') {
        state.content.path = payload.contentPath.trim();
      }
    },


    /**
     * Reducer to set the width of the second sidebar. If no width is given, the second
     * sidebar is set to the default width.
     */
    setWidth: (state, { payload }: PayloadAction<number | undefined>) => {
      state.width = isNumber(payload, { withoutInfinite: true })
        ? Math.max(0, Math.round(payload))
        : layout.secondSidebar.defaultWidth;
    },


    /**
     * Reducer to minimize the second sidebar.
     */
    minimize: (state) => {
      if (state.isMinimizable) {
        state.isMinimized = true;
      }
    },


    /**
     * Reducer to maximize the second sidebar.
     */
    maximize: (state) => {
      state.isMinimized = false;
    },
  },


  selectors: {
    /**
     * Selector that returns true when the second sidebar is initialized and ready to use.
     */
    selectIsReady: (state: SecondSidebarState) => state.isReady,


    /**
     * Selector that returns the width of the second sidebar in pixels.
     */
    selectWidth: (state: SecondSidebarState) => state.width,


    /**
     * Selector that returns true when the second sidebar is minimizable.
     */
    selectIsMinimizable: (state: SecondSidebarState) => state.isMinimizable,


    /**
     * Selector that returns true if the second sidebar is minimized or false if not.
     */
    selectIsMinimized: (state: SecondSidebarState) => state.isMinimized,


    /**
     * Selector that returns true when the second sidebar is resizable.
     */
    selectIsResizable: (state: SecondSidebarState) => state.isResizable,


    /**
     * Selector that returns the type of the storage, used by the second sidebar.
     */
    selectStorageType: (state: SecondSidebarState) => state.storageType,


    /**
     * Selector that returns the content path, if set in the configuration. If not set, an empty
     * string is returned.
     */
    selectContentPath: (state: SecondSidebarState) => state.content.path,
  },
});


declare module 'store/store.types' {
  export interface LazyLoadedSlices extends WithSlice<typeof slice> {} // eslint-disable-line @typescript-eslint/no-empty-object-type
}

rootReducer.inject({
  reducerPath: slice.reducerPath,
  reducer: enhancedReducerCreator<SecondSidebarState>(slice, createInitialState),
});


export const { name } = slice;

export const {
  init, configure, setWidth, maximize, minimize,
} = slice.actions;

export const {
  selectIsReady, selectWidth, selectIsMinimizable, selectIsMinimized, selectIsResizable,
  selectStorageType, selectContentPath,
} = slice.getSelectors((rootState: RootState) => rootState[slice.reducerPath] ?? initialState);
