import type { ImageViewerCloseEvent, ImageViewerImageId } from '../imageViewer.types';


/** The props of the React sub-component "Header" of the popup component "ImageViewer". */
export interface HeaderProps {
  /** The title of the viewer, shown above everything else and hidden while the image is expanded. */
  readonly title?: string | number;
  /** The line below the title, which belongs to the shown image. */
  readonly subtitle?: string | number;
  /** Whether the natural size of the shown image stands in that line. */
  readonly showDimensions?: boolean;
  /** How many images the viewer holds, which it counts out beside the subtitle from two on. */
  readonly numImages?: number;
  /** The ID of the shown image, by which the header reads that image's measurements. */
  readonly imageId?: ImageViewerImageId | null;
  /** The place of the shown image among the others, counted from zero; -1 stands for none. */
  readonly imageIdx?: number;
  /** Whether the viewer runs on a mobile device, where the title is hidden and the zoom controls
   * are left out. */
  readonly isMobile?: boolean;
  /** Whether the viewer shows the image expanded, where the header gives up its title and draws
   * its controls closer together. */
  readonly isExpanded?: boolean;
  /** Callback prop that is called when the button to expand or shrink the image is clicked. */
  readonly onToggleExpand?: () => void;
  /** Callback prop that is called when the button to open the image in a tab of its own is
   * clicked. */
  readonly onOpenImage?: () => void;
  /** Callback prop that is called when the button to close the viewer is clicked, with the event
   * that clicked it. */
  readonly onClose?: ({ event }: { event: ImageViewerCloseEvent }) => void;
}
