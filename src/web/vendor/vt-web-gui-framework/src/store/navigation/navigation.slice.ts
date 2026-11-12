import { createSlice } from '@reduxjs/toolkit';

import { enhancedReducerCreator } from 'store/enhancedReducerCreator';

import type { AdditionalUrlPath, NavigationState } from './navigation.types';
import { createInitialState } from './utils/createInitialState';


const initialState: NavigationState = {
  addUrlPathes: {
    byPath: {},
    allPathes: [],
  },
  urlQueries: {
    preserve: false,
  },
  logs: [],
};


/**
 * Redux Toolkit slice that handles the partial state of navigation settings. This slice is exported
 * as default below.
 */
const slice = createSlice({
  name: 'VIWGF/navigation',
  reducerPath: 'navigation',
  initialState,

  reducers: {},

  selectors: {
    /**
     * Selector to return the enabled additional URL path entry, selected by a given url path (it
     * must have a leading slash and no trailing slash). If no one can be found, null is returned.
     */
    selectEnabledAdditionalUrlPathEntryByUrlPath: (state: NavigationState, urlPath: string): AdditionalUrlPath | null => {
      const path = state.addUrlPathes.allPathes.find((p) => (
        (state.addUrlPathes.byPath[p]?.path === urlPath)
        && !state.addUrlPathes.byPath[p].isDisabled
      ));

      return path ? state.addUrlPathes.byPath[path] ?? null : null;
    },


    /**
     * Selector to return true, if all key value pairs of the URL query string should be preserved
     * at navigation, or false if non of them. If only any keys should be preserved, an array with
     * this keys (in lower cases) is returned.
     */
    selectPreservedUrlQueries: (state: NavigationState): boolean | string[] => state.urlQueries.preserve,


    /**
     * Selector to return a memoized array with log entries occured in the navigation part of the
     * Redux store.
     */
    selectLogs: (state: NavigationState) => state.logs,
  },
});


export const reducer = enhancedReducerCreator<NavigationState>(slice, createInitialState);

export const { name, reducerPath } = slice;

export const {
  selectEnabledAdditionalUrlPathEntryByUrlPath, selectPreservedUrlQueries, selectLogs,
} = slice.selectors;
