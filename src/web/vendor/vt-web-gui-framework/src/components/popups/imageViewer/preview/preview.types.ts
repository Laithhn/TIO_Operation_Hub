import type { ImageViewerImageId } from '../imageViewer.types';


/** The props of the React sub-component "Preview" of the popup component "ImageViewer". */
export interface PreviewProps {
  /** The ID of the shown image, whose thumbnail the strip marks and keeps in its middle. */
  readonly selectedId?: ImageViewerImageId | null;
  /** The sources of the images by their ID, in the order they are shown. */
  readonly images?: Record<ImageViewerImageId, string>;
  /** Whether the viewer runs on a mobile device, where the strip is scrolled by touch alone and
   * carries no scroll buttons. */
  readonly isMobile?: boolean;
  /** Callback prop that is called with the ID of the thumbnail that was clicked. */
  readonly onSelect?: ({ id }: { id: ImageViewerImageId }) => void;
}
