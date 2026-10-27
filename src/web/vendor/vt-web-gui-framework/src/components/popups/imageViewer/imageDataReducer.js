import { createContext } from 'react';

import { isNumber } from 'utils/type';

import imageViewerDefines from './defines';

export const ImageDataContext = createContext(null);


/**
 * Exported function to create the initial state.
 */
export const initialState = () => ({
  byId: {},
  allIds: [],
});


/**
 *
 */
const imageDataReducer = (state, { type, payload }) => {
  switch (type) {
    // ---------------------------------------------------------------------------------------------
    case 'SET_DIMS':
    // ---------------------------------------------------------------------------------------------

      if (
        (payload.width === state.byId[payload.id]?.width)
        && (payload.height === state.byId[payload.id]?.height)
      ) {
        return state;
      }

      return {
        ...state,
        byId: {
          ...state.byId,
          [payload.id]: {
            ...state.byId[payload.id],
            width: payload.width,
            height: payload.height,
          },
        },
        ...(!state.byId[payload.id] && {
          allIds: [...state.allIds, payload.id],
        }),
      };

    // ---------------------------------------------------------------------------------------------
    case 'SET_FITTING_RATIO': {
    // ---------------------------------------------------------------------------------------------

      if (!isNumber(payload.ratio, { withoutInfinite: true, min: 0 })) {
        return state;
      }

      const fittingZoom = payload.ratio * 100;
      let zoom = null;

      if (fittingZoom === state.byId[payload.id]?.fittingZoom) {
        return state;
      }

      const roundedFittingZoom = Math.round(fittingZoom);
      const zoomSteps = imageViewerDefines.zoomSteps.reduce((acc, val, idx) => [
        ...acc,
        ...((roundedFittingZoom > (imageViewerDefines.zoomSteps[idx - 1] ?? 0)) && (roundedFittingZoom < val)
          ? [fittingZoom] : []),
        (val === roundedFittingZoom) ? fittingZoom : val,
        ...((idx === (imageViewerDefines.zoomSteps.length - 1)) && (roundedFittingZoom > val)
          ? [fittingZoom] : []),
      ], []);

      if (
        state.byId[payload.id]
        && (state.byId[payload.id].zoom !== null)
        && (state.byId[payload.id].zoom !== state.byId[payload.id].fittingZoom)
      ) {
        zoom = state.byId[payload.id].zoom;
      }

      return {
        ...state,
        byId: {
          ...state.byId,
          [payload.id]: {
            ...state.byId[payload.id],
            zoomSteps,
            fittingZoom,
            zoom,
          },
        },
        ...(!state.byId[payload.id] && {
          allIds: [...state.allIds, payload.id],
        }),
      };
    }

    // ---------------------------------------------------------------------------------------------
    case 'SET_ZOOM':
    // ---------------------------------------------------------------------------------------------

      if (
        !state.byId[payload.id]
        || !isNumber(payload.zoom, { withoutInfinite: true, min: 0 })
        || (payload.zoom === state.byId[payload.id].zoom)
      ) {
        return state;
      }

      return {
        ...state,
        byId: {
          ...state.byId,
          [payload.id]: {
            ...state.byId[payload.id],
            zoom: payload.zoom,
          },
        },
      };

    // ---------------------------------------------------------------------------------------------
    case 'ZOOM_FIT':
    // ---------------------------------------------------------------------------------------------

      if (
        !state.byId[payload.id]
        || !state.byId[payload.id].zoom
        || (state.byId[payload.id].zoom === state.byId[payload.id].fittingZoom)
      ) {
        return state;
      }

      return {
        ...state,
        byId: {
          ...state.byId,
          [payload.id]: {
            ...state.byId[payload.id],
            zoom: state.byId[payload.id].fittingZoom,
          },
        },
      };

    // ---------------------------------------------------------------------------------------------
    case 'ZOOM_IN_OUT': {
    // ---------------------------------------------------------------------------------------------

      if (!state.byId[payload.id]) {
        return state;
      }

      const currentZoom = state.byId[payload.id].zoom ?? state.byId[payload.id].fittingZoom;
      let idx = state.byId[payload.id].zoomSteps.findIndex((val) => (val === currentZoom)),
        nextZoom;

      if (idx === undefined) {
        nextZoom = state.byId[payload.id].fittingZoom;
      } else {
        idx = Math.max(0, Math.min((state.byId[payload.id].zoomSteps.length - 1), (idx + payload.dir)));
        nextZoom = state.byId[payload.id].zoomSteps[idx];

        if (payload.limitToFit) {
          nextZoom = Math.max(state.byId[payload.id].fittingZoom, nextZoom);
        }
      }

      if (nextZoom === currentZoom) {
        return state;
      }

      return {
        ...state,
        byId: {
          ...state.byId,
          [payload.id]: {
            ...state.byId[payload.id],
            zoom: nextZoom,
          },
        },
      };
    }

    default:
      return state;
  }
};

export default imageDataReducer;


export const actions = {
  /**
   *
   */
  setDims: (id, { width, height }) => ({
    type: 'SET_DIMS',
    payload: { id, width, height },
  }),


  /**
   *
   */
  setFittingRatio: (id, ratio) => ({
    type: 'SET_FITTING_RATIO',
    payload: { id, ratio },
  }),


  /**
   *
   */
  setZoom: (id, zoom) => ({
    type: 'SET_ZOOM',
    payload: { id, zoom },
  }),


  /**
   *
   */
  zoomFit: (id) => ({
    type: 'ZOOM_FIT',
    payload: { id },
  }),


  /**
   *
   */
  zoomInOut: (id, dir, { limitToFit = false } = { limitToFit: false }) => ({
    type: 'ZOOM_IN_OUT',
    payload: { id, dir, limitToFit },
  }),
};


export const selectors = {
  /**
   * Reducer to return the original width in pixels of an image, selected by a given ID.
   *
   * @returns {number|null}
   */
  getWidthById: (state, id) => state.byId[id]?.width ?? null,


  /**
   * Reducer to return the original height in pixels of an image, selected by a given ID.
   *
   * @returns {number|null}
   */
  getHeightById: (state, id) => state.byId[id]?.height ?? null,


  /**
   * Reducer to return true if zoom is anabled for an image, selected by a given ID.
   *
   * @returns {boolean}
   */
  isZoomEnabled: (state, id) => !!state.byId[id]?.fittingZoom,


  /**
   * Reducer to return a memoized array with all available zoom values in percent including the
   * fitting zoom value of an image, selected by a given ID.
   *
   * @returns {number[]|null}
   */
  getZoomStepsById: (state, id) => state.byId[id]?.zoomSteps ?? null,


  /**
   * Reducer to return the zoom value in percent as float of an image, selected by a given ID, that
   * is calculated to fit into a container. If the fitting zoom value was not yet set, null is
   * returned. This also means, that zooming is not (yet) enabled for this image.
   *
   * @returns {number|null}
   */
  getFittingZoomById: (state, id) => state.byId[id]?.fittingZoom ?? null,


  /**
   * Reducer to return the zoom value currently set in percent as a number of an image, selected by
   * a given ID. Null is returned if no zoom has been set yet.
   *
   * @returns {number|null}
   */
  getZoomById: (state, id) => state.byId[id]?.zoom ?? null,
};
