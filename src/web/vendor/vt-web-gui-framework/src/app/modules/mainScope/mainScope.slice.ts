import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { ContentType } from 'app/modules/content';

import { type MainScopeState } from './mainScope.types';


const initialState: MainScopeState = {
  isLoading: false,
  contentType: 'none',
};


/**
 * Redux Toolkit slice that handles the partial state of the app module "MainScope".
 */
const slice = createSlice({
  name: 'VIWGF/mainScope',
  reducerPath: 'mainScope',
  initialState,

  reducers: {
    /**
     * Reducer that indicates that loading a content into the main scope starts.
     */
    startLoadingContent: (state, _: PayloadAction<string>) => { // eslint-disable-line @typescript-eslint/no-unused-vars
      state.isLoading = true;
    },


    /**
     * Reducer that indicates that the loading of a content into the main scope has been finished.
     */
    finishLoadingContent: (state, { payload }: PayloadAction<ContentType | undefined>) => {
      state.isLoading = false;
      state.contentType = payload ?? 'none';
    },


    /**
     * Reducer that indicates that the content component in the main scope was destructed.
     */
    unloadContent: (state) => {
      state.isLoading = false;
      state.contentType = 'none';
    },
  },


  selectors: {
    /**
     * Selector to return the type of the content that is loaded into it.
     */
    selectContentType: (state: MainScopeState) => state.contentType,
  },
});


export const { reducer, name, reducerPath } = slice;

export const { finishLoadingContent, startLoadingContent, unloadContent } = slice.actions;

export const { selectContentType } = slice.selectors;
