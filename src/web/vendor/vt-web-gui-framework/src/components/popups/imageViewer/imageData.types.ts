import type { ImageViewerImageId } from './imageViewer.types';


/** What the image viewer knows about one of its images. Everything in it is measured rather than
 * given: the size comes from the loaded image, the zoom values from that size and the space the
 * image has. A field is therefore absent until the image has been loaded and measured. */
export interface ImageData {
  /** The natural width of the image in pixels. */
  width?: number;
  /** The natural height of the image in pixels. */
  height?: number;
  /** The zoom values the image offers, in percent and ascending: the fixed steps of the viewer with
   * the fitting zoom sorted into them, so that stepping through them always meets it. */
  zoomSteps?: number[];
  /** The zoom in percent at which the image fits into the space it has. */
  fittingZoom?: number;
  /** The zoom in percent currently set, or null while the image is shown at its fitting zoom. */
  zoom?: number | null;
}


/** The state of the image data reducer: what the viewer has measured, one entry per image. */
export interface ImageDataReducerState {
  byId: Record<ImageViewerImageId, ImageData>;
  allIds: ImageViewerImageId[];
}


export type ImageDataReducerActions
  = | { type: 'SET_DIMS'; payload: { id: ImageViewerImageId; width: number; height: number } }
    | { type: 'SET_FITTING_RATIO'; payload: { id: ImageViewerImageId; ratio: number } }
    | { type: 'SET_ZOOM'; payload: { id: ImageViewerImageId; zoom: number } }
    | { type: 'ZOOM_FIT'; payload: { id: ImageViewerImageId } }
    | { type: 'ZOOM_IN_OUT'; payload: { id: ImageViewerImageId; dir: number; limitToFit?: boolean } };


/** What the image data context carries: the measured data of every image and the way to add to it.
 * The header and the image read from it, the image writes to it. */
export interface ImageDataContextData {
  imageDataState: ImageDataReducerState;
  imageDataDispatch: React.Dispatch<ImageDataReducerActions>;
}
