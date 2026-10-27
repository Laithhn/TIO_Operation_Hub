import type { ImageViewerImageId } from '../imageViewer.types';


/** The image on screen: the pair the element renders, which lags behind the props while the change
 * from one image to the next is running. */
export interface ShownImage {
  id: ImageViewerImageId | null;
  src: string | null;
}


/** The props of the hook "useImageChange" of the popup component "ImageViewer". */
export interface UseImageChangeProps {
  /** The ID of the image that is to be shown. */
  readonly id?: ImageViewerImageId | null;
  /** The source of the image that is to be shown. */
  readonly src?: string | null;
}


/** What the hook "useImageChange" returns. */
export interface UseImageChangeResult {
  /** The image the element shows, which is the one asked for only once the change has run. */
  shownImage: ShownImage;
  /** The zoom of the shown image in percent, null while it has not been measured. */
  zoom: number | null;
  /** Whether the shown image answers pointer and wheel. It does so while it stands still, and
   * neither during the change nor before the first image has arrived. */
  enableInteractions: boolean;
  /** Whether the image is to be invisible, which it is through the whole change but for the two
   * animated halves at its ends. */
  fadeOut: boolean;
  /** Steps the zoom of the shown image one step in or out. A step outside a standing image is
   * dropped, as is one for an image whose fitting zoom is not yet known. */
  stepZoom: (dir: number, options?: { limitToFit?: boolean }) => void;
}
