/** The ID of an image inside the image viewer: the key it is given in the prop "images", or the
 * index of its entry where that prop is an array. */
export type ImageViewerImageId = string;


/** The images the viewer shows, in one of three forms: the source of a single image, an array of
 * sources whose indexes become the IDs, or an object whose keys become the IDs. An entry whose
 * source is not a non-empty string is dropped. */
export type ImageViewerImages = string | string[] | Record<ImageViewerImageId, string>;


/** The event that asks the viewer to close: a pointer or a key on its close button, or the escape
 * key, which the viewer listens for on the window and which is therefore a native event. */
export type ImageViewerCloseEvent
  = KeyboardEvent
    | React.PointerEvent<HTMLSpanElement>
    | React.MouseEvent<HTMLSpanElement>
    | React.KeyboardEvent<HTMLSpanElement>;


/** The props of the React component of the popup component "ImageViewer". */
export interface ImageViewerProps {
  /** The title of the viewer, which stands above everything else and belongs to the set of images
   * rather than to one of them. */
  readonly title?: string | number;
  /** The line below the title. A function is asked anew for every image, which is how a line
   * belonging to the shown image is written. */
  readonly subtitle?: string | number | ((id: ImageViewerImageId) => string | number);
  /** The source of an image to lay behind the viewer, blurred and darkened. */
  readonly backgroundImage?: string;
  /** The images to show, in any of the three forms. */
  readonly images?: ImageViewerImages;
  /** The ID of the image to open at. An ID naming no image, and null, open the first one. */
  readonly startId?: ImageViewerImageId | null;
  /** Whether the viewer follows changes of the prop "images". Without it the list is taken once, as
   * the viewer opened it: a set of images opened for looking through stays what it was, even where
   * something deletes images in the background. With it the viewer follows, and an image that
   * disappears while it is shown hands over to its neighbour. */
  readonly followImages?: boolean;
  /** Whether the viewer runs on a mobile device, where it leaves out what needs a pointer: the
   * navigation buttons beside the image, the scroll buttons of the preview strip, the zoom. */
  readonly isMobile?: boolean;
  /** Whether the shown image can be zoomed, by the wheel, by two fingers and by the controls of the
   * header. The wheel keeps the point under the cursor where it is and two fingers the point
   * between them; the controls of the header grow the image from its middle. */
  readonly enableZoom?: boolean;
  /** Whether the natural size of the shown image stands in the line below the title. */
  readonly showDimensions?: boolean;
  /** Callback prop that is called with the ID of the shown image when it is clicked with a mouse,
   * and with the pointer event that clicked it. Setting it is what makes an image selectable at
   * all, which the pointer shows. */
  readonly onSelect?: ({ id, event }: { id: ImageViewerImageId; event: PointerEvent }) => void;
  /** Callback prop that is called when the viewer is to be closed, by its button or by the escape
   * key, and with the event that asked for it. The viewer only reports this: the call site takes it
   * out of the document. */
  readonly onClose?: ({ event }: { event: ImageViewerCloseEvent }) => void;
}
