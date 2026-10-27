import { createSelector } from '@reduxjs/toolkit';

import Enums from 'assets/enums';
import deepEqual from 'utils/deepEqual';


export const initialState = {
  contentPath: undefined,
  contentType: Enums.ContentType.NONE,
  isScopeModwin: false,
  callerId: '',
  contentData: {},
  isContentRestored: false,
  content: null,
  error: {
    message: '',
    fileName: '',
    lineNumber: '',
  },
};


/**
 * The reducer, exported as default below.
 */
const reducer = (state, { type, payload }) => {
  switch (type) {
    // ---------------------------------------------------------------------------------------------
    case 'SET_CONTENT':
    // ---------------------------------------------------------------------------------------------

      if (
        !(payload.contentType instanceof Enums.ContentType)
        || (payload.contentType === Enums.ContentType.NONE)
        || !((payload.content === null) || payload.content?.default)
        || (
          (payload.contentPath === state.contentPath)
          && (payload.contentType === state.contentType)
          && (payload.isScopeModwin === state.isScopeModwin)
          && (payload.callerId === state.callerId)
          && (payload.contentData === state.contentData)
          && (payload.isContentRestored === state.isContentRestored)
          && (payload.content === state.content)
          && (state.error.message === '')
          && (state.error.fileName === '')
          && (state.error.lineNumber === '')
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
        error: {
          ...initialState.error,
        },
      };

    // ---------------------------------------------------------------------------------------------
    case 'SET_ERROR':
    // ---------------------------------------------------------------------------------------------

      if (
        (payload.contentPath === state.contentPath)
        && (state.contentType === Enums.ContentType.ERROR)
        && (payload.isScopeModwin === state.isScopeModwin)
        && (payload.callerId === state.callerId)
        && deepEqual(state.contentData, {})
        && (state.content === null)
        && (payload.message === state.error.message)
        && (payload.fileName === state.error.fileName)
        && (payload.lineNumber === state.error.lineNumber)
      ) {
        return state;
      }

      return {
        ...initialState,
        contentPath: payload.contentPath,
        contentType: Enums.ContentType.ERROR,
        isScopeModwin: payload.isScopeModwin,
        callerId: payload.callerId,
        error: {
          message: payload.message,
          fileName: payload.fileName,
          lineNumber: payload.lineNumber,
        },
      };

    default:
      return state;
  }
};

export default reducer;


export const actions = {
  /**
   * Exported content action creator to set a loaded content.
   *
   * @param {object} content
   * @param {object} metaData
   * @param {string} metaData.contentPath
   * @param {ContentType} metaData.contentType
   * @param {boolean} metaData.isScopeModwin
   * @param {string} metaData.callerId
   * @param {object} metaData.contentData
   * @param {boolean} metaData.isContentRestored
   */
  setContent: (content, {
    contentPath, contentType, isScopeModwin, callerId, contentData, isContentRestored,
  }) => ({
    type: 'SET_CONTENT',
    payload: {
      contentPath, contentType, isScopeModwin, callerId, contentData, isContentRestored, content,
    },
  }),


  /**
   * Exported content action creator to set a loaded content.
   *
   * @param {string|object} error - Either a string with an error message or an object with optional
   *   fields "message", "fileName" and "lineNumber".
   * @param {object} metaData
   * @param {string} metaData.contentPath - The content path that was tried to load when the error
   *   occured.
   * @param {boolean} metaData.isScopeModwin
   * @param {string} metaData.callerId
   */
  setError: (error, { contentPath, isScopeModwin, callerId }) => ({
    type: 'SET_ERROR',
    payload: {
      contentPath: contentPath ?? '',
      isScopeModwin: isScopeModwin ?? false,
      callerId: callerId ?? '',
      message: (typeof error === 'string') ? error : (error.message ?? ''),
      fileName: error.fileName ?? '',
      lineNumber: error.lineNumber.toString() ?? '',
    },
  }),
};


export const selectors = {
  /**
   * Exported content selector to return the path of the currently loaded content. If no content was
   * tried to load before, undefined is returned
   *
   * @param {object} state
   * @returns {string}
   */
  getContentPath: (state) => state.contentPath,


  /**
   * Exported content selector to return the type of the currently loaded content.
   *
   * @param {object} state
   * @returns {Enums.ContentType}
   */
  getContentType: (state) => state.contentType,


  /**
   * Exported content selector to return the React component of the currently loaded content or null
   * if there is no content loaded.
   *
   * @param {object} state
   * @returns {object|null}
   */
  getContent: (state) => state.content,


  /**
   * Exported content selector to return the error object with the following content:
   * { message: string, fileName: string, lineNumber: string }.
   *
   * @param {object} state
   *
   * @return{{message: string, fileName: string, lineNumber: string}}
   */
  getContentError: (state) => state.error,


  /**
   * Exported content selector to return a memoized value object for the scope context provider.
   *
   * @param {object} state
   * @returns {ContextScopeData}
   */
  getContextScopePoviderValue: createSelector(
    (state) => state.isScopeModwin,
    (state) => state.callerId,
    (state) => state.contentData,
    (state) => state.isContentRestored,
    (isScopeModwin, callerId, contentData, isContentRestored) => ({
      isScopeModwin,
      isScopeSecondSidebar: false,
      callerId,
      contentData,
      isContentRestored,
    }),
  ),
};
