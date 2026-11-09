/** The props of the React hook "useScrollHandlers". */
export interface UseScrollHandlersProps<E = Element> {
  /** Set to true, to enable scrolling by mouse wheel. */
  readonly enableWheel?: boolean;
  /** Set to true, to enable scrolling by touch. */
  readonly enableTouch?: boolean;
  /** Set to true, to enable scrolling by keyboard. */
  readonly enableKeys?: boolean;
  /** Factor for the additional scoll way after touch end (is multiplied with the last touch X
   * delta). Set to 0 to disable touch overrun. Default: 10. */
  readonly touchOverrunFactorX?: number;
  /** Factor for the additional scoll way after touch end (is multiplied with the last touch Y
   * delta). Set to 0 to disable touch overrun. Default: 10. */
  readonly touchOverrunFactorY?: number;
  /** Distance for scrolling by keys PageUp or PageDown in pixels. It is recommended to take about
   * 90% of the visible height of the scrolling component. Default: 100. */
  readonly pageKeysScrollSteps?: number;
  /** Callback prop that is called if scrolling vertically. It propagates the scroll difference
   * (delta) since the last call as number in pixles. */
  readonly onChangeX?: ({ diff, event }: { diff: number; event: KeyboardEvent | React.TouchEvent<E> | React.WheelEvent<E> }) => void;
  /** Callback prop that is called if scrolling horizontally. It propagates the scroll difference
   * (delta) since the last call as number in pixles. */
  readonly onChangeY?: ({ diff, event }: { diff: number; event: KeyboardEvent | React.TouchEvent<E> | React.WheelEvent<E> }) => void;
}


/** The returned value of the React hook "useScrollHandlers". */
export interface UseScrollHandlersResult<E = Element> {
  /** Handler for the synthetic React event "onWheel". Only if prop "enableWheel" is true. */
  onWheel?: React.WheelEventHandler<E>;
  /** Handler for the synthetic React event "onTouchStart". Only if prop "enableTouch" is true. */
  onTouchStart?: React.TouchEventHandler<E>;
  /** Handler for the synthetic React event "onTouchMove". Only if prop "enableTouch" is true. */
  onTouchMove?: React.TouchEventHandler<E>;
  /** Handler for the synthetic React event "onTouchEnd". Only if prop "enableTouch" is true. */
  onTouchEnd?: React.TouchEventHandler<E>;
}
