import {
  useCallback, useEffect, useRef, useState,
} from 'react';

import { useThrottledCallback } from 'components/hooks/useThrottledCallback';

import type { UseDragProps, UseDragResult } from './useDrag.types';


/**
 * React hook "useDrag" to handle the dragging of an element by the mouse or by a touch pointer.
 * Note that you have to set the CSS attribute "touch-action" to "none" at the element you want to
 * drag!
 */
export const useDrag = <E = Element>({
  rangeX = [-Infinity, Infinity], rangeY = [-Infinity, Infinity], throttleDelayMs = 60,
  pointerDownPropagation = false, onStartDragging, onStopDragging, onDrag,
}: UseDragProps<E>): UseDragResult<E> => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [isPointerDown, setIsPointerDown] = useState(false);

  const startPosXRef = useRef(0);
  const startPosYRef = useRef(0);
  const prevsRef = useRef({ pointerPosX: 0, pointerPosY: 0 });


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // Taken apart into numbers: a caller passes new arrays on every render, and what the handlers
  // below are memoized on has to be their values.
  const [rangeXMin, rangeXMax] = rangeX;
  const [rangeYMin, rangeYMax] = rangeY;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the synthetic React event "onPointerDown" with the left mouse button or as touch
   * event: get ready to drag now.
   */
  const handlePointerDown: React.PointerEventHandler<E> = (event) => {
    if (
      ((event.pointerType === 'mouse') && (event.button === 0))
      || (event.pointerType === 'touch')
    ) {
      event.preventDefault();

      if (!pointerDownPropagation) {
        event.stopPropagation();
      }

      // The absolute position of the pointer at start of dragging.
      startPosXRef.current = Math.max(rangeXMin, Math.min(rangeXMax, event.pageX));
      startPosYRef.current = Math.max(rangeYMin, Math.min(rangeYMax, event.pageY));
      prevsRef.current.pointerPosX = 0;
      prevsRef.current.pointerPosY = 0;

      onStartDragging?.(event);

      setIsPointerDown(true);
    }
  };


  /**
   * Handler for the native event "pointermove" of the window element. Here the
   * callback prop "onDrag" is called with the new calculated absolute dragging offset value and the
   * real pointer movement difference.
   */
  const handleWindowPointerMove = useThrottledCallback((event: PointerEvent) => {
    // The position of the mouse or touch pointer in relation to the starting point of the movement,
    // see event "handlePointerDown".
    const pointerPosX = Math.max(rangeXMin, Math.min(rangeXMax, event.pageX)) - startPosXRef.current;
    const pointerPosY = Math.max(rangeYMin, Math.min(rangeYMax, event.pageY)) - startPosYRef.current;

    // The relative movement of the pointer since the last call.
    const pointerDiffX = pointerPosX - prevsRef.current.pointerPosX;
    const pointerDiffY = pointerPosY - prevsRef.current.pointerPosY;

    prevsRef.current.pointerPosX = pointerPosX;
    prevsRef.current.pointerPosY = pointerPosY;

    onDrag?.({
      posX: pointerPosX,
      posY: pointerPosY,
      diffX: pointerDiffX,
      diffY: pointerDiffY,
      event,
    });
  }, { delay: throttleDelayMs });


  /**
   * Handler for the native events "pointerup" and "pointercancel" of the window element to stop
   * dragging and to remove the event listeners from the document. The browser cancels a pointer it
   * takes over for a gesture of its own, and no pointer up follows then.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const handleWindowPointerUp = useCallback((event: PointerEvent) => {
    onStopDragging?.(event);
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
      window.addEventListener('pointercancel', handleWindowPointerUp);

      return () => {
        window.removeEventListener('pointermove', handleWindowPointerMove);
        window.removeEventListener('pointerup', handleWindowPointerUp);
        window.removeEventListener('pointercancel', handleWindowPointerUp);
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
