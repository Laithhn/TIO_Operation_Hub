/** The props of the React hook "useDrag". */
export interface UseDragProps<E = Element> {
  /** The minimium to maximum range of the movement in absolute coordinates in the X direction. */
  readonly rangeX?: [number, number];
  /** The minimium to maximum range of the movement in absolute coordinates in the Y direction. */
  readonly rangeY?: [number, number];
  /** Throttle time in milliseconds for the moving of the pointer. Default: 60 ms. */
  readonly throttleDelayMs?: number;
  /** Set to true, to propagate the pointer down event. */
  readonly pointerDownPropagation?: boolean;
  /** Callback prop that is called before start dragging the element. */
  readonly onStartDragging?: React.PointerEventHandler<E>;
  /** Callback prop that is called at the end of dragging the element. */
  readonly onStopDragging?: (event: PointerEvent) => void;
  /** Callback prop that is called while dragging the element. "posX" and "posY" are the position
   * since start of dragging as number in pixels. "diffX" and "diffY" are the position difference
   * (delta) in since the last call as number in pixles. */
  readonly onDrag?: ({
    posX, posY, diffX, diffY, event,
  }: {
    posX: number; posY: number; diffX: number; diffY: number; event: PointerEvent;
  }) => void;
}


/** The returned value of the React hook "useDrag". */
export interface UseDragResult<E = Element> {
  dragProps: {
    /** Handler for the synthetic React event "onPointerDown". */
    onPointerDown: React.PointerEventHandler<E>;
  };
}
