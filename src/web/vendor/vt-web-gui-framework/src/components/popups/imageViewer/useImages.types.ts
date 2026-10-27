import type { ImageViewerImageId, ImageViewerImages } from './imageViewer.types';


/** The props of the hook "useImages" of the popup component "ImageViewer". */
export interface UseImagesProps {
  /** The images to show, in any of the three forms the viewer takes. */
  readonly images: ImageViewerImages;
  /** The ID of the image to open at. An ID naming no image, and null, open the first one. */
  readonly startId?: ImageViewerImageId | null;
  /** Whether the viewer follows changes of the prop "images". Without it the list is taken once,
   * which is what keeps the selection still while images vanish in the background. */
  readonly followImages?: boolean;
}


/** What the hook "useImages" returns: the images it shows, which of them is selected, and the three
 * ways to move that selection. */
export interface UseImagesResult {
  /** The sources of the shown images by their ID. */
  imagesById: Record<ImageViewerImageId, string>;
  /** The IDs of the shown images, in the order they are shown. */
  allImageIds: ImageViewerImageId[];
  /** The ID of the selected image, null while there is no image to select. */
  selectedId: ImageViewerImageId | null;
  /** Selects the image of a given ID. An ID naming none of the shown images is ignored. */
  selectById: (id: ImageViewerImageId) => void;
  /** Selects the image before the selected one, and stays at the first one. */
  selectPrevId: () => void;
  /** Selects the image after the selected one, and stays at the last one. */
  selectNextId: () => void;
}


/** The selected image, held as its ID together with the place it sits at. The place is what lets
 * the viewer step to the neighbour when the image itself disappears: an ID alone leaves no trace of
 * where it stood. */
export interface SelectedImage {
  id: ImageViewerImageId;
  idx: number;
}
