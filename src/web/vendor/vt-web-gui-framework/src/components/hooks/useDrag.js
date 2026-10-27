import {
  useState, useRef, useEffect, useCallback,
} from 'react';

import { useThrottledCallback } from 'components/hooks/useThrottle';


const defaultFunction = () => {};


/**
 * @typedef {object} UseDragValue
 * @porperty {object} dragProps - Object with props for the element.
 * @property {function} dragProps.onPointerDown - Handler for synthetic React event.
 */

/**
 * React hook to handle the dragging of an element by the mouse or by a touch pointer.
 * Note that you have to set the CSS attribute "touch-action" to "none" at the element you want to
 * drag!
 *
 * @param {object} options
 * @param {number[]} [options.rangeX=[-Infinity, Infinity]] - The minimium to maximum range of the
 *   movement in absolute coordinates in the X direction.
 * @param {number[]} [options.rangeY=[-Infinity, Infinity]] - The minimium to maximum range of the
 * movement in absolute coordinates in the Y direction.
 * @param {number} [options.throttleDelayMs=60] - Throttle time in milliseconds for the moving of
 *   the pointer
 * @param {boolean} [options.pointerDownPropagation=false] - Set to true, to propagate the pointer
 *   down event.
 * @param {function} [options.onStartDragging] - Callback function (must be memoized) that is called
 *   before start dragging the element. Arguments: 1. the event object.
 * @param {function} [options.onStopDragging] - Callback function (must be memoized) that is called
 *   at the end of dragging the element. Arguments: 1. the event object.
 * @param {function} [options.onDrag] - Callback function (must be memoized) that is called while
 *   dragging the element. Arguments: 1. the X position since start of dragging as number in pixels,
 *   2. the Y position since start of dragging as number in pixels, 3. the scroll difference (delta)
 *   in direction X since the last call as number in pixles, 4. the scroll difference (delta) in
 *   direction Y since the last call as number in pixles and 5. the event object.
 * @returns {UseDragValue}
 */
const useDrag = ({
  rangeX = [-Infinity, Infinity],
  rangeY = [-Infinity, Infinity],
  throttleDelayMs = 60,
  pointerDownPropagation = false,
  onStartDragging = defaultFunction,
  onStopDragging = defaultFunction,
  onDrag = defaultFunction,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const startPosXRef = useRef(0);
  const startPosYRef = useRef(0);
  const prevsRef = useRef({});

  // re-arrange due to memoization
  const rangeXMin = rangeX[0] ?? -Infinity;
  const rangeXMax = rangeX[1] ?? Infinity;
  const rangeYMin = rangeY[0] ?? -Infinity;
  const rangeYMax = rangeY[1] ?? Infinity;

  const [isPointerDown, setIsPointerDown] = useState(false);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for synthetic React event "onPointerDown" with the left mouse button or as touch event:
   * get ready to drag now.
   */
  const handlePointerDown = useCallback((event) => {
    if (
      ((event.pointerType === 'mouse') && (event.button === 0))
      || (event.pointerType === 'touch')
    ) {
      event.preventDefault();

      if (!pointerDownPropagation) {
        event.stopPropagation();
      }

      // the absolute position of the pointer at start of dragging
      startPosXRef.current = Math.max(rangeXMin, Math.min(rangeXMax, event.pageX));
      startPosYRef.current = Math.max(rangeYMin, Math.min(rangeYMax, event.pageY));
      prevsRef.current.pointerPosX = 0;
      prevsRef.current.pointerPosY = 0;

      onStartDragging(event);

      setIsPointerDown(true);
    }
  }, [rangeXMin, rangeXMax, rangeYMin, rangeYMax, pointerDownPropagation, onStartDragging]);


  /**
   *
   *
   * Memoized handler for event "pointer move" on the window element. Here the callback prop
   * "onDrag" is called with the new calculated absolute dragging offset value and the real pointer
   * movement difference.
   */
  const handleWindowPointerMove = useThrottledCallback(useCallback((event) => {
    // the position of the mouse or touch pointer in relation to the starting point of the movement,
    // see event handlePointerDown
    const pointerPosX = Math.max(rangeXMin, Math.min(rangeXMax, event.pageX)) - startPosXRef.current;
    const pointerPosY = Math.max(rangeYMin, Math.min(rangeYMax, event.pageY)) - startPosYRef.current;

    // the relative movement of the pointer since the last call
    const pointerDiffX = pointerPosX - (prevsRef.current.pointerPosX ?? 0);
    const pointerDiffY = pointerPosY - (prevsRef.current.pointerPosY ?? 0);

    prevsRef.current.pointerPosX = pointerPosX;
    prevsRef.current.pointerPosY = pointerPosY;

    onDrag(pointerPosX, pointerPosY, pointerDiffX, pointerDiffY, event);
  }, [rangeXMin, rangeXMax, rangeYMin, rangeYMax, onDrag]), { delay: throttleDelayMs });


  /**
   * Memoized handler for event "pointer up" on the window element: stop drapping and remove the
   * event listeners from the document.
   */
  const handleWindowPointerUp = useCallback((event) => {
    onStopDragging(event);
    setIsPointerDown(false);
  }, [onStopDragging]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (isPointerDown) {
      window.addEventListener('pointermove', handleWindowPointerMove);
      window.addEventListener('pointerup', handleWindowPointerUp);

      return () => {
        window.removeEventListener('pointermove', handleWindowPointerMove);
        window.removeEventListener('pointerup', handleWindowPointerUp);
      };
    }

    return undefined;
  }, [isPointerDown, handleWindowPointerMove, handleWindowPointerUp]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return {
    dragProps: {
      onPointerDown: handlePointerDown,
    },
  };
  //                                                                                  </editor-fold>
};

export default useDrag;
