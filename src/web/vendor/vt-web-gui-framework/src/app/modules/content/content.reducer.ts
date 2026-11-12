import { createSelector } from '@reduxjs/toolkit';

import { deepEqual } from 'utils/deepEqual';

import type { ContentReducerActions, ContentReducerState } from './content.types';


export const initialState: ContentReducerState = {
  contentPath: '',
  contentType: 'none',
  isScopeModwin: false,
  callerId: '',
  contentData: null,
  isContentRestored: false,
  content: null,
  error: '',
};


/**
 * The content reducer.
 */
export const contentReducer = (state: ContentReducerState, { type, payload }: ContentReducerActions) => {
  switch (type) {
    // ---------------------------------------------------------------------------------------------
    case 'SET_CONTENT':
    // ---------------------------------------------------------------------------------------------

      if (
        (payload.contentType === 'none')
        || (
          (payload.contentPath === state.contentPath)
          && (payload.contentType === state.contentType)
          && (payload.isScopeModwin === state.isScopeModwin)
          && (payload.callerId === state.callerId)
          && deepEqual(payload.contentData, state.contentData)
          && (payload.isContentRestored === state.isContentRestored)
          && deepEqual(payload.content, state.content)
          && (state.error === initialState.error)
        )
      ) {
        return state;
      }

      return {
        contentPath: payload.contentPath,
        contentType: payload.contentType,
        isScopeModwin: payload.isScopeModwin,
        callerId: payload.callerId,
        contentData: payload.contentData,
        isContentRestored: payload.isContentRestored,
        content: payload.content,
        error: initialState.error,
      } as ContentReducerState;

    // ---------------------------------------------------------------------------------------------
    case 'SET_CONTENT_ERROR':
    // ---------------------------------------------------------------------------------------------

      if (
        (payload.contentPath === state.contentPath)
        && (state.contentType === 'error')
        && (payload.isScopeModwin === state.isScopeModwin)
        && (payload.callerId === state.callerId)
        && (state.contentData === initialState.contentData)
        && (state.isContentRestored === initialState.isContentRestored)
        && (state.content === initialState.content)
        && (payload.error === state.error)
      ) {
        return state;
      }

      return {
        contentPath: payload.contentPath,
        contentType: 'error',
        isScopeModwin: payload.isScopeModwin,
        callerId: payload.callerId,
        contentData: initialState.contentData,
        isContentRestored: initialState.isContentRestored,
        content: initialState.content,
        error: payload.error,
      } as ContentReducerState;

    default:
      return state;
  }
};


/**
 * Content action creator to set a loaded content.
 */
export const setContent = (content: ContentReducerState['content'], {
  contentPath, contentType, isScopeModwin, callerId, contentData, isContentRestored,
}: Pick<ContentReducerState, 'contentPath' | 'contentType' | 'isScopeModwin' | 'callerId' | 'contentData' | 'isContentRestored'>): ContentReducerActions => ({
  type: 'SET_CONTENT',
  payload: {
    contentPath, contentType, isScopeModwin, callerId, contentData, isContentRestored, content,
  },
});


/**
 * Content action creator to set an error.
 */
export const setContentError = (error: ContentReducerState['error'], { contentPath, isScopeModwin, callerId }: Pick<ContentReducerState, 'contentPath' | 'isScopeModwin' | 'callerId'>): ContentReducerActions => ({
  type: 'SET_CONTENT_ERROR',
  payload: {
    contentPath, isScopeModwin, callerId, error,
  },
});


/**
 * Content selector to return the path of the currently loaded content. If no content was tried to
 * load before, en empty string is returned
 */
export const selectContentPath = (state: ContentReducerState) => state.contentPath;


/**
 * Content selector to return the type of the currently loaded content.
 */
export const selectContentType = (state: ContentReducerState) => state.contentType;


/**
 * Content selector to return true, if the scope of the content is a modal window.
 */
export const selectIsScopeModwin = (state: ContentReducerState) => state.isScopeModwin;


/**
 * Content selector to return the ID of the caller.
 */
export const selectCallerId = (state: ContentReducerState) => state.callerId;


/**
 * Content selector to return true, if the content was restored by navigation.
 */
export const selectIsContentRestored = (state: ContentReducerState) => state.isContentRestored;


/**
 * Content selector to return the React component of the currently loaded content or null if there
 * is no content loaded.
 */
export const selectContent = (state: ContentReducerState) => state.content;


/**
 * Exported content selector to return the error object with the following content:
 */
export const selectContentError = (state: ContentReducerState) => state.error;


/**
 * Content selector to return a memoized value object for the content context provider.
 */
export const selectContextProviderValue = createSelector(
  (state: ContentReducerState) => state.isScopeModwin,
  (state: ContentReducerState) => state.callerId,
  (state: ContentReducerState) => state.contentData,
  (state: ContentReducerState) => state.isContentRestored,
  (isScopeModwin, callerId, contentData, isContentRestored) => ({
    isScopeModwin,
    isScopeSecondSidebar: false,
    callerId,
    contentData,
    isContentRestored,
  }),
);
