import type { ImageViewerImageId } from '../imageViewer.types';


/** How far a dragging gesture has come. A pointer that went down is "ready", and it stays that way
 * until it has moved far enough to count as dragging rather than as a click. */
export type DraggingStatus = 'idle' | 'ready' | 'dragging' | 'stoppedAfterDragging' | 'stoppedWithoutDragging';


/** How far a zoomed image has been moved inside its container, kept per image so that a return to
 * it finds it where it was left. "overDragX" belongs to the gesture rather than to an image: it is
 * how far a finger has pulled the image past its edge, which is what a swipe to the next image
 * looks like on the way. */
export interface PanValues {
  byId: Record<ImageViewerImageId, { x: number; y: number }>;
  overDragX: number;
}


/** The props of the React sub-component "Image" of the popup component "ImageViewer". */
export interface ImageProps {
  /** The ID of the image to show. */
  readonly id?: ImageViewerImageId | null;
  /** The source of the image to show. */
  readonly src?: string | null;
  /** Whether a click on the image reports it to the call site, which shows the pointer as one that
   * can select. */
  readonly isSelectable?: boolean;
  /** Callback prop that reports which image is on screen. It follows the prop "id" only once the
   * change from one image to the next has run, which is what keeps the header in step with what is
   * shown rather than with what was asked for. */
  readonly onSetImageDelayed?: ({ id }: { id: ImageViewerImageId | null }) => void;
  /** Callback prop that reports the natural size of a loaded image and the zoom at which it fits
   * into the space it has. It is called again whenever that space changes. */
  readonly onImageLoaded?: ({
    id, width, height, ratioToFit,
  }: {
    id: ImageViewerImageId; width: number; height: number; ratioToFit: number;
  }) => void;
  /** Callback prop that is called when the image is clicked without being dragged. The kind of
   * pointer is what the call site answers differently: a mouse selects the image, a finger expands
   * it. The event is the one the drag hook ended on, and therefore a native one. */
  readonly onClick?: ({ pointerType, event }: { pointerType: string; event: PointerEvent }) => void;
  /** Callback prop to select the image before this one. Left out, there is none to select, and the
   * image cannot be swiped in that direction either. */
  readonly onSelectPrev?: () => void;
  /** Callback prop to select the image after this one. Left out, there is none to select, and the
   * image cannot be swiped in that direction either. */
  readonly onSelectNext?: () => void;
}
