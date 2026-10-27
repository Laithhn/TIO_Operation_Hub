/** The side of the shown image a navigation button lies on. */
export type NaviButtonPos = 'left' | 'right';


/** The props of the React sub-component "NaviButton" of the popup component "ImageViewer". */
export interface NaviButtonProps {
  /** The side of the image the button lies on, which is also the side its arrow points to. */
  readonly pos: NaviButtonPos;
  /** Whether the button is shown. It fades in and out with this prop rather than appearing at
   * once, and it is gone from the document while it is hidden. */
  readonly visible?: boolean;
  /** Whether the viewer shows the image expanded, where the button is smaller and the space it
   * spans is a different one. */
  readonly isExpanded?: boolean;
  /** Callback prop that is called as soon as the button is clicked. */
  readonly onClick?: () => void;
}
