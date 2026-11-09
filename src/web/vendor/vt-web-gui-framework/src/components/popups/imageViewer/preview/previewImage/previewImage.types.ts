import type { ImageViewerImageId } from '../../imageViewer.types';


/** The props of the React sub-component "PreviewImage" of the popup component "ImageViewer". */
export interface PreviewImageProps {
  /** The ID of the image this thumbnail stands for. */
  readonly id: ImageViewerImageId;
  /** The source of the image. Default value: an empty string. */
  readonly src?: string;
  /** Whether this thumbnail is the one of the shown image, which lifts and outlines it. */
  readonly isSelected?: boolean;
  /** Callback prop that reports how wide the thumbnail turned out once its image has loaded. The
   * preview strip adds those widths up to centre the selected thumbnail, which it cannot measure
   * itself: the widths differ per image and are known only after loading. */
  readonly onReportWidth?: ({ id, width }: { id: ImageViewerImageId; width: number }) => void;
  /** Callback prop that is called as soon as the thumbnail is clicked. */
  readonly onClick?: ({ id }: { id: ImageViewerImageId }) => void;
}
