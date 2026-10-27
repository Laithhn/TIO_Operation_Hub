import { useRef, useCallback, useEffect } from 'react';

import scrollingDefines from './defines';


const defaultFunction = () => {};


/**
 * @typedef {object} UseScrollHandlersValue
 * @property {function} onWheel - Handler for synthetic React event onWheel, but only, if option
 *   enableWheel is true.
 * @property {function} onTouchStart - Handler for synthetic React event onTouchStart, but only, if
 *   option enableTouch is true.
 * @property {function} onTouchMove - Handler for synthetic React event onTouchMove, but only, if
 *   option enableTouch is true.
 * @property {function} onTouchEnd - Handler for synthetic React event onTouchEnd, but only, if
 *   option enableTouch is true.
 */

/**
 * React hook to handle the vertical and horizontal scrolling of a given container by the mouse
 * wheel and / or by moving a touch pointer over the container and / or by keyboard events.
 *
 * @param {object} options
 * @param {boolean} [options.enableWheel=false] - Set to true, to enable scrolling by mouse wheel.
 * @param {boolean} [options.enableTouch=false] - Set to true, to enable scrolling by touch.
 * @param {boolean} [options.enableKeys=false] - Set to true, to enable scrolling by keyboard.
 * @param {number} [options.touchOverrunFactorX=10] - Factor for the additional scoll way after
 *   touch end (is multiplied with the last touch X delta). Set to 0 to disable touch overrun.
 * @param {number} [options.touchOverrunFactorY=10] - Factor for the additional scoll way after
 *   touch end (is multiplied with the last touch Y delta). Set to 0 to disable touch overrun.
 * @param {number} [options.pageKeysScrollSteps=100] - Distance for scrolling by keys PageUp or
 *   PageDown in pixels. It is recommended to take about 90% of the visible height of the scrolling
 *   element.
 * @param {function} [options.onChangeX] - Callback function (must be memoized) that is called if
 *   scrolling vertically. Arguments: 1. the scroll difference (delta) since the last call as number
 *   in pixles and 2. the event object.
 * @param {function} [options.onChangeY] - Callback function (must be memoized) that is called if
 *   scrolling horizontally. Arguments: 1. the scroll difference (delta) since the last call as
 *   number in pixles and 2. the event object.
 * @returns {UseScrollHandlersValue}
 */
const useScrollHandlers = ({
  enableWheel = false,
  enableTouch = false,
  enableKeys = false,
  touchOverrunFactorX = 10,
  touchOverrunFactorY = 10,
  pageKeysScrollSteps = 100,
  onChangeX = defaultFunction,
  onChangeY = defaultFunction,
} = {
  enableWheel: false,
  enableTouch: false,
  enableKeys: false,
  touchOverrunFactorX: 10,
  touchOverrunFactorY: 10,
  pageKeysScrollSteps: 100,
  onChangeX: defaultFunction,
  onChangeY: defaultFunction,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const touchIntervalRef = useRef(0);
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


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Memoized handler for synthetic event "onWheel" to set the vertical and horizontal scroll
   * distance.
   */
  const handleWheel = useCallback((event) => {
    // the propagation of the wheel event is always stopped, because there may only be one wheel
    // functionallity in the DOM tree of the element
    event.stopPropagation();

    let deltaX, deltaY;

    if (event.deltaMode === 1) {
      deltaX = event.deltaX * scrollingDefines.scrolling.mouseWheelLineHeight;
      deltaY = event.deltaY * scrollingDefines.scrolling.mouseWheelLineHeight;
    } else {
      deltaX = event.deltaX;
      deltaY = event.deltaY;
    }

    // secondary mouse wheel => horizontal scrolling
    if (deltaX) {
      onChangeX(deltaX, event);
    }

    // primary mouse wheel => vertical or horizontal scrolling (depending on the shift key)
    if (deltaY) {
      if (event.shiftKey) {
        onChangeX(deltaY, event);
      } else {
        onChangeY(deltaY, event);
      }
    }
  }, [onChangeX, onChangeY]);


  /**
   * Memoized handler for synthetic event "onTouchStart" to begin vertical and / or horizontal
   * scrolling by touch.
   */
  const handleTouchStart = useCallback((event) => {
    event.stopPropagation();

    clearInterval(touchIntervalRef.current);

    touchStartPosXRef.current = event.changedTouches[0].pageX;
    touchStartPosYRef.current = event.changedTouches[0].pageY;

    onChangeX(0, event);
    onChangeY(0, event);
  }, [onChangeX, onChangeY]);


  /**
   * Memoized handler for synthetic event "onTouchMove" to scroll by moving the touch pointer. Note,
   * that this handler is also called by handler handleTouchEnd. In this case, the event object has
   * only restricted elements.
   */
  const handleTouchMove = useCallback((event) => {
    if (event.stopPropagation) {
      event.stopPropagation();
    }

    const posX = event.changedTouches[0].pageX;
    const posY = event.changedTouches[0].pageY;
    const deltaX = touchStartPosXRef.current - posX;
    const deltaY = touchStartPosYRef.current - posY;

    // save the deltas for handleTouchEnd
    touchDeltaXRef.current = deltaX;
    touchDeltaYRef.current = deltaY;

    // horizontal scrolling
    if (deltaX) {
      onChangeX(deltaX, event);
      touchStartPosXRef.current = posX;
    }

    // vertical scrolling
    if (deltaY) {
      onChangeY(deltaY, event);
      touchStartPosYRef.current = posY;
    }
  }, [onChangeX, onChangeY]);


  /**
   * Memoized handler for synthetic event "onTouchEnd" on the data table to finish scrolling by
   * touch.
   */
  const handleTouchEnd = useCallback((event) => {
    event.stopPropagation();

    let startPosX = event.changedTouches[0].pageX,
      startPosY = event.changedTouches[0].pageY,
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

      handleTouchMove({
        changedTouches: [{
          pageX: startPosX,
          pageY: startPosY,
        }],
        target: event.target,
        type: lastEvent ? 'touchend' : 'touchmove',
      });
    }, 10);
  }, [touchOverrunFactorX, touchOverrunFactorY, handleTouchMove]);


  /**
   * Memoized handler for native event "keydown" on the window element to scroll by keys.
   */
  const handleKeyDown = useCallback((event) => {
    switch (event.key) {
      case 'Home':
        onChangeX(-Infinity, event);
        onChangeY(-Infinity, event);
        break;

      case 'End':
        onChangeX(Infinity, event);
        onChangeY(Infinity, event);
        break;

      case 'PageUp': onChangeY(-pageKeysScrollSteps, event); break;
      case 'PageDown': onChangeY(pageKeysScrollSteps, event); break;
      case 'ArrowUp': onChangeY(-scrollingDefines.scrolling.arrowKeysScrollSteps, event); break;
      case 'ArrowDown': onChangeY(scrollingDefines.scrolling.arrowKeysScrollSteps, event); break;
      case 'ArrowLeft': onChangeX(-scrollingDefines.scrolling.arrowKeysScrollSteps, event); break;
      case 'ArrowRight': onChangeX(scrollingDefines.scrolling.arrowKeysScrollSteps, event); break;
      // no default
    }
  }, [pageKeysScrollSteps, onChangeX, onChangeY]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (enableKeys) {
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }

    return undefined;
  }, [enableKeys, handleKeyDown]);


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

export default useScrollHandlers;
