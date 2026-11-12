import { useCallback, useEffect, useRef } from 'react';

import type { UseScrollHandlersProps, UseScrollHandlersResult } from './useScrollHandlers.types';


const mouseWheelLineHeight = 25;
const arrowKeysScrollSteps = 100;


/**
 * React hook to handle the vertical and horizontal scrolling of a given container by the mouse
 * wheel and / or by moving a touch pointer over the container and / or by keyboard events.
 */
export const useScrollHandlers = <E = Element>({
  enableWheel = false, enableTouch = false, enableKeys = false, touchOverrunFactorX = 10,
  touchOverrunFactorY = 10, pageKeysScrollSteps = 100, onChangeX, onChangeY,
}: UseScrollHandlersProps<E>): UseScrollHandlersResult<E> => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const touchIntervalRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const touchStartPosXRef = useRef(0);
  const touchStartPosYRef = useRef(0);
  const touchDeltaXRef = useRef(0);
  const touchDeltaYRef = useRef(0);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to scroll by the way between the last touch position and the given one, for a
   * moving touch pointer as well as for the overrun after it has been lifted. The position is
   * passed in rather than read from the event: the overrun has no touch of its own, and the touch
   * list of an event can't be written to.
   */
  const scrollByTouch = (posX: number, posY: number, event: React.TouchEvent<E>) => {
    const deltaX = touchStartPosXRef.current - posX;
    const deltaY = touchStartPosYRef.current - posY;

    // save the deltas for handleTouchEnd
    touchDeltaXRef.current = deltaX;
    touchDeltaYRef.current = deltaY;

    // horizontal scrolling
    if (deltaX) {
      onChangeX?.({ diff: deltaX, event });
      touchStartPosXRef.current = posX;
    }

    // vertical scrolling
    if (deltaY) {
      onChangeY?.({ diff: deltaY, event });
      touchStartPosYRef.current = posY;
    }
  };


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the synthetic React event "onWheel" of the element, this hook is used for,
   * to set the vertical and horizontal scroll distance.
   */
  const handleWheel: React.WheelEventHandler<E> = (event) => {
    // The propagation of the wheel event is always stopped, because there may only be one wheel
    // functionallity in the DOM tree of the element.
    event.stopPropagation();

    let deltaX, deltaY;

    if (event.deltaMode === 1) {
      deltaX = event.deltaX * mouseWheelLineHeight;
      deltaY = event.deltaY * mouseWheelLineHeight;
    } else {
      ({ deltaX, deltaY } = event);
    }

    // secondary mouse wheel => horizontal scrolling
    if (deltaX) {
      onChangeX?.({ diff: deltaX, event });
    }

    // primary mouse wheel => vertical or horizontal scrolling (depending on the shift key)
    if (deltaY) {
      if (event.shiftKey) {
        onChangeX?.({ diff: deltaY, event });
      } else {
        onChangeY?.({ diff: deltaY, event });
      }
    }
  };


  /**
   * Handler for the synthetic React event "onTouchStart" of the element, this hook is used for, to
   * begin vertical and / or horizontal scrolling by touch.
   */
  const handleTouchStart: React.TouchEventHandler<E> = (event) => {
    event.stopPropagation();

    clearInterval(touchIntervalRef.current);

    touchStartPosXRef.current = event.changedTouches[0]?.pageX ?? 0;
    touchStartPosYRef.current = event.changedTouches[0]?.pageY ?? 0;

    onChangeX?.({ diff: 0, event });
    onChangeY?.({ diff: 0, event });
  };


  /**
   * Handler for the synthetic React event "onTouchMove" of the element, this hook is used for, to
   * scroll by moving the touch pointer.
   */
  const handleTouchMove: React.TouchEventHandler<E> = (event) => {
    event.stopPropagation();

    scrollByTouch(event.changedTouches[0]?.pageX ?? 0, event.changedTouches[0]?.pageY ?? 0, event);
  };


  /**
   * Handler for the synthetic React event "onTouchEnd" of the element, this hook is used for on the
   * data table to finish scrolling by touch.
   */
  const handleTouchEnd: React.TouchEventHandler<E> = (event) => {
    event.stopPropagation();

    let startPosX = event.changedTouches[0]?.pageX ?? 0,
      startPosY = event.changedTouches[0]?.pageY ?? 0,
      addScrollWayX = touchDeltaXRef.current * touchOverrunFactorX,
      addScrollWayY = touchDeltaYRef.current * touchOverrunFactorY,
      lastEvent = false;

    touchIntervalRef.current = setInterval(() => {
      const valueX = addScrollWayX / 10;
      const valueY = addScrollWayY / 10;
      startPosX -= valueX;
      startPosY -= valueY;

      addScrollWayX -= valueX;
      addScrollWayY -= valueY;

      if ((Math.abs(addScrollWayX) < 5) && (Math.abs(addScrollWayY) < 5)) {
        clearInterval(touchIntervalRef.current);
        lastEvent = true;
      }

      scrollByTouch(startPosX, startPosY, {
        ...event,
        type: lastEvent ? 'touchend' : 'touchmove',
      });
    }, 10);
  };


  /**
   * Handler for the native event "keydown" of the window element to scroll by
   * keys.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const handleWindowKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'Home':
        onChangeX?.({ diff: -Infinity, event });
        onChangeY?.({ diff: -Infinity, event });
        break;

      case 'End':
        onChangeX?.({ diff: Infinity, event });
        onChangeY?.({ diff: Infinity, event });
        break;

      case 'PageUp': onChangeY?.({ diff: -pageKeysScrollSteps, event }); break;
      case 'PageDown': onChangeY?.({ diff: pageKeysScrollSteps, event }); break;
      case 'ArrowUp': onChangeY?.({ diff: -arrowKeysScrollSteps, event }); break;
      case 'ArrowDown': onChangeY?.({ diff: arrowKeysScrollSteps, event }); break;
      case 'ArrowLeft': onChangeX?.({ diff: -arrowKeysScrollSteps, event }); break;
      case 'ArrowRight': onChangeX?.({ diff: arrowKeysScrollSteps, event }); break;
      // no default
    }
  }, [pageKeysScrollSteps, onChangeX, onChangeY]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (enableKeys) {
      window.addEventListener('keydown', handleWindowKeyDown);

      return () => {
        window.removeEventListener('keydown', handleWindowKeyDown);
      };
    }

    return undefined;
  }, [enableKeys, handleWindowKeyDown]);


  useEffect(() => () => {
    clearInterval(touchIntervalRef.current);
  }, []);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return {
    ...(enableWheel && {
      onWheel: handleWheel,
    }),
    ...(enableTouch && {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    }),
  };
  //                                                                                  </editor-fold>
};
