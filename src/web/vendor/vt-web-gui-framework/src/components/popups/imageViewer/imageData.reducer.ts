import { isNumber } from 'utils/type';

import type { ImageData, ImageDataReducerActions, ImageDataReducerState } from './imageData.types';
import type { ImageViewerImageId } from './imageViewer.types';


/** The zoom values the viewer offers in percent, ascending. The zoom that fits an image into its
 * space is sorted into them per image (see the action "SET_FITTING_RATIO"), so that stepping
 * through the steps always meets it. */
const defaultZoomSteps = [10, 25, 50, 75, 100, 150, 200, 300, 400, 600, 800, 1200];


/**
 * Helper function to write the data of one image into the state, adding its ID to "allIds" where
 * the image is a new one. The caller decides what changes; this only keeps the two halves of the
 * state in step.
 */
const withImageData = (
  state: ImageDataReducerState, id: ImageViewerImageId, data: ImageData,
): ImageDataReducerState => ({
  ...state,
  byId: {
    ...state.byId,
    [id]: { ...state.byId[id], ...data },
  },
  ...(!state.byId[id] && { allIds: [...state.allIds, id] }),
});


export const imageDataInitialArg: ImageDataReducerState = {
  byId: {},
  allIds: [],
};


/**
 * The image data reducer of the popup component "ImageViewer". Every case returns the state itself
 * where nothing changes, so that a measurement repeating its result costs no render.
 */
export const imageDataReducer = (
  state: ImageDataReducerState, action: ImageDataReducerActions,
): ImageDataReducerState => {
  switch (action.type) {
    // ---------------------------------------------------------------------------------------------
    case 'SET_DIMS': {
    // ---------------------------------------------------------------------------------------------

      const { id, width, height } = action.payload;
      const imageData = state.byId[id];

      if ((width === imageData?.width) && (height === imageData.height)) {
        return state;
      }

      return withImageData(state, id, { width, height });
    }

    // ---------------------------------------------------------------------------------------------
    case 'SET_FITTING_RATIO': {
    // ---------------------------------------------------------------------------------------------

      const { id, ratio } = action.payload;
      const imageData = state.byId[id];

      if (!isNumber(ratio, { withoutInfinite: true, gte: 0 })) {
        return state;
      }

      const fittingZoom = ratio * 100;

      if (fittingZoom === imageData?.fittingZoom) {
        return state;
      }

      // The fitting zoom takes its place among the fixed steps: before the first step it undercuts,
      // in place of a step it rounds to, or after the last one it exceeds.
      const roundedFittingZoom = Math.round(fittingZoom);
      const zoomSteps = defaultZoomSteps.flatMap((step, idx) => {
        const prevStep = defaultZoomSteps[idx - 1] ?? 0;
        const isLast = (idx === (defaultZoomSteps.length - 1));

        return [
          ...(((roundedFittingZoom > prevStep) && (roundedFittingZoom < step)) ? [fittingZoom] : []),
          (step === roundedFittingZoom) ? fittingZoom : step,
          ...((isLast && (roundedFittingZoom > step)) ? [fittingZoom] : []),
        ];
      });
      // A zoom the user has set survives a new measurement; one that was merely the old fitting zoom
      // gives way to the new one.
      const currentZoom = imageData?.zoom ?? null;
      const zoom = ((currentZoom !== null) && (currentZoom !== imageData?.fittingZoom))
        ? currentZoom
        : null;

      return withImageData(state, id, { zoomSteps, fittingZoom, zoom });
    }

    // ---------------------------------------------------------------------------------------------
    case 'SET_ZOOM': {
    // ---------------------------------------------------------------------------------------------

      const { id, zoom } = action.payload;

      if (
        !state.byId[id]
        || !isNumber(zoom, { withoutInfinite: true, gte: 0 })
        || (zoom === state.byId[id].zoom)
      ) {
        return state;
      }

      return withImageData(state, id, { zoom });
    }

    // ---------------------------------------------------------------------------------------------
    case 'ZOOM_FIT': {
    // ---------------------------------------------------------------------------------------------

      const { id } = action.payload;
      const imageData = state.byId[id];

      if (!imageData?.zoom || (imageData.zoom === imageData.fittingZoom)) {
        return state;
      }

      return withImageData(state, id, { zoom: imageData.fittingZoom ?? null });
    }

    // ---------------------------------------------------------------------------------------------
    case 'ZOOM_IN_OUT': {
    // ---------------------------------------------------------------------------------------------

      const { id, dir, limitToFit = false } = action.payload;
      const imageData = state.byId[id];

      if (!imageData) {
        return state;
      }

      const currentZoom = imageData.zoom ?? imageData.fittingZoom ?? null;
      const zoomSteps = imageData.zoomSteps ?? [];
      const currentIdx = zoomSteps.findIndex((step) => (step === currentZoom));
      let nextZoom;

      if (currentIdx < 0) {
        // The image stands at a zoom that is none of its steps, which leaves no step to move from:
        // the fitting zoom is the one value that is always among them.
        nextZoom = imageData.fittingZoom ?? null;
      } else {
        const nextIdx = Math.max(0, Math.min((zoomSteps.length - 1), (currentIdx + dir)));

        nextZoom = zoomSteps[nextIdx] ?? null;

        if (limitToFit && (nextZoom !== null) && (imageData.fittingZoom !== undefined)) {
          nextZoom = Math.max(imageData.fittingZoom, nextZoom);
        }
      }

      if ((nextZoom === null) || (nextZoom === currentZoom)) {
        return state;
      }

      return withImageData(state, id, { zoom: nextZoom });
    }

    default:
      return state;
  }
};


export const setDims = (
  id: ImageViewerImageId, width: number, height: number,
): ImageDataReducerActions => ({
  type: 'SET_DIMS',
  payload: { id, width, height },
});


export const setFittingRatio = (
  id: ImageViewerImageId, ratio: number,
): ImageDataReducerActions => ({
  type: 'SET_FITTING_RATIO',
  payload: { id, ratio },
});


export const setZoom = (id: ImageViewerImageId, zoom: number): ImageDataReducerActions => ({
  type: 'SET_ZOOM',
  payload: { id, zoom },
});


export const zoomFit = (id: ImageViewerImageId): ImageDataReducerActions => ({
  type: 'ZOOM_FIT',
  payload: { id },
});


export const zoomInOut = (
  id: ImageViewerImageId, dir: number, limitToFit = false,
): ImageDataReducerActions => ({
  type: 'ZOOM_IN_OUT',
  payload: { id, dir, limitToFit },
});


/** The natural width of an image in pixels, null while it has not been measured. */
export const selectWidthById = (
  state: ImageDataReducerState, id: ImageViewerImageId,
): number | null => state.byId[id]?.width ?? null;


/** The natural height of an image in pixels, null while it has not been measured. */
export const selectHeightById = (
  state: ImageDataReducerState, id: ImageViewerImageId,
): number | null => state.byId[id]?.height ?? null;


/** Whether the image can be zoomed, which it can as soon as the zoom fitting it is known. */
export const selectIsZoomEnabled = (
  state: ImageDataReducerState, id: ImageViewerImageId,
): boolean => !!state.byId[id]?.fittingZoom;


/** The zoom values an image offers in percent, ascending, null while it has not been measured. */
export const selectZoomStepsById = (
  state: ImageDataReducerState, id: ImageViewerImageId,
): number[] | null => state.byId[id]?.zoomSteps ?? null;


/** The zoom in percent at which an image fits into the space it has, null while it has not been
 * measured - which also means that zooming is not yet possible for it. */
export const selectFittingZoomById = (
  state: ImageDataReducerState, id: ImageViewerImageId,
): number | null => state.byId[id]?.fittingZoom ?? null;


/** The zoom in percent currently set for an image, null while it is shown at its fitting zoom. */
export const selectZoomById = (
  state: ImageDataReducerState, id: ImageViewerImageId,
): number | null => state.byId[id]?.zoom ?? null;
