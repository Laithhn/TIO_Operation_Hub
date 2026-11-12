export type ScrollBarStatus = 'inactive' | 'scrolling' | 'hover';


export type ScrollBarDir = 'verticalStart' | 'verticalEnd' | 'horizontal';


export interface DerivedScrollValues {
  show: boolean;
  isVertical: boolean;
  /** The dimension (width or height) of the not visible part of the container. */
  dimInvisible: number;
  /** The dimension (width or height) of the not visible part of the container in number of steps if
   * given or 0 if not. */
  dimInvisibleInSteps: number;
  /** The dimension (width or height) of the scoll bar handle. */
  dimScrollHandle: number;
  /** Factor to calculate the offset of the scroll bar handle by a given scroll offset: scroll
   * handle offset = scroll offset * scroll way factor. */
  scrollWayFactor: number;
}


/** The props of the React component of the helper component "ScrollBar". */
export interface ScrollBarProps {
  /** This prop determines the position of the scroll bar: "verticalStart" and "verticalEnd" create
   * a vertical scroll bar at the left or right side of the container in which it is placed.
   * "horizontal" creates a horizontal scroll bar at the bottom of the container. Default value:
   * "verticalEnd". */
  readonly dir?: ScrollBarDir;
  /** This prop provides the scroll bar with the visible height or width of the area being scrolled.
   * This are usually the JavaScript values "clientHeight" or "clientWidth". */
  readonly dimVisible: number;
  /** This prop passes the entire height or width of the area being scrolled to the scroll bar. This
   * are usually the JavaScript values "scrollHeight" or "scrollWidth". */
  readonly dimTotal: number;
  /** This prop describes a fixed height or width at the beginning of the scrollable area that is
   * not scrolled and is therefore subtracted from the visible height or width (see prop
   * "dimVisible"). This can be used, for example, if a fixed table header or similar must be taken
   * into account. */
  readonly dimOffset?: number;
  /** This prop describes a fixed height or width at the end of the scrollable area that is not
   * scrolled and is therefore subtracted from the visible height or width (see prop "dimVisible").
   * This can be used, for example, if a fixed table footer or similar needs to be taken into
   * account. */
  readonly dimOffsetEnd?: number;
  /** This prop provides the scroll bar with the current scroll value in pixels. This is usually the
   * JavaScript values "scrollTop" or "scrollLeft". Please note that the scroll value for horizontal
   * scroll bars must be normalized (greater than or equal to 0) regardless of the browser used and
   * the read/write direction. The auxiliary functions "convertScrollLeft" and
   * "convertScrollLeftOfElement" can be used for this purpose. */
  readonly scrollOffset?: number;
  /** If this prop is given a value greater than 0, scrolling will occur incrementally with a step
   * size corresponding to the value given in pixels. */
  readonly scrollSteps?: number;
  /** If the scroll bar should not occupy the full height or width of the container in which it is
   * placed, it can be indented at the beginning by setting this prop. */
  readonly scrollBarOffset?: number;
  /** If the scroll bar should not occupy the full height or width of the container in which it is
   * placed, it can be indented at the end by setting this prop. */
  readonly scrollBarOffsetEnd?: number;
  /** By setting this prop to true, the scroll bar moves smoothly (transition). */
  readonly smoothScrolling?: boolean;
  /** By default, the scroll bar is aligned at the inner side of the container in which it is
   * placed. However, if you want it to be outside the container, this prop must be set to true.
   * Please note that the overflow property of this container must not be "hidden"! */
  readonly handleOutside?: boolean;
  /** This callback prop is called either when the scroll bar is moved (event "pointermove") or when
   * the area before or after the scroll bar is clicked (event "pointerdown"). The given scroll
   * values are normalized (greater than or equal to 0) regardless of the browser used and the
   * read/write direction. */
  readonly onScroll?: ({ scrollPos, scrollDiff, event }: { scrollPos: number; scrollDiff: number; event: PointerEvent | React.PointerEvent<HTMLElement> }) => void;
}
