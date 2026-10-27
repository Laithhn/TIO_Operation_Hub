import { createSlice, type PayloadAction, type WithSlice } from '@reduxjs/toolkit';

import {
  enhancedReducerCreator, pushLogEntry, type RootState, SliceStatus,
} from 'store';
import { rootReducer } from 'store/rootReducer';

import type { FooterState } from './footer.types';
import { createInitialState } from './utils/createInitialState';
import { parseContentPath } from './utils/parseContentPath';


const initialState: FooterState = {
  status: SliceStatus.PENDING,
  contentPath: '',
  logs: [],
};


/**
 * Redux Toolkit slice that handles the partial state of the app module "Footer". Note that the
 * reducer of this slice isn't exported below, but is injected into the root reducer as soon as this
 * slice is used.
 */
const slice = createSlice({
  name: 'VIWGF/footer',
  reducerPath: 'footer',
  initialState,

  reducers: {
    /**
     * Reducer to set the status of this slice.
     */
    setStatus: {
      prepare: (status: SliceStatus, hint?: string) => ({
        payload: {
          status,
          hint,
        },
      }),
      reducer: (state, { payload: { status, hint } }: PayloadAction<{ status: SliceStatus; hint: string | undefined }>) => {
        state.status = status;

        if (hint) {
          pushLogEntry(state.logs, {
            slice: 'footer',
            level: (status === SliceStatus.ERROR) ? 'error' : 'info',
            timestamp: Date.now(),
            text: hint,
          });
        }
      },
    },


    /**
     * Reducer to set the path of the content showing inside the footer. It must be a relative path
     * inside the content folder. A file name can be given, but then it must be "content.jsx" or
     * "content.tsx" (default).
     */
    setContentPath: (state, { payload }: PayloadAction<string>) => {
      state.contentPath = parseContentPath(payload);
    },
  },


  selectors: {
    /**
     * Selector that returns the content path of the footer with leading slash an file name. If not
     * set, an empty string is returned.
     */
    selectContentPath: (state: FooterState) => state.contentPath,
  },
});


declare module 'store/store.types' {
  export interface LazyLoadedSlices extends WithSlice<typeof slice> {} // eslint-disable-line @typescript-eslint/no-empty-object-type
}

rootReducer.inject({
  reducerPath: slice.reducerPath,
  reducer: enhancedReducerCreator<FooterState>(slice, createInitialState),
});


export const { name } = slice;

export const { setStatus, setContentPath } = slice.actions;

export const { selectContentPath } = slice.getSelectors((rootState: RootState) => rootState[slice.reducerPath] ?? initialState);
