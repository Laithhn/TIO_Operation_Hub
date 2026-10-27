import { Enumify } from 'enumify';
import PropTypes from 'prop-types';
import {
  memo, useState, useRef, useMemo, useCallback, useEffect,
} from 'react';

import useDrag from 'components/hooks/useDrag';
import { hooks } from 'store';
import classNames from 'utils/classNames';

import scrollingDefines from '../defines';
import css from './scrollBar.scss';


/**
 * Enum for the direction of the scroll bar. All enumeration values have the default elements "name"
 * and "ordinal".
 *
 * @property {object} VERTICAL_START - Vertical scroll bar on the start-side of the content.
 * @property {object} VERTICAL_END - Vertical scroll bar on the end-side of the content.
 * @property {object} HORIZONTAL - Horizontal scroll bar.
 * @property {function} enumValues - Return an array with all enum objects.
 */
class ScrollBarDir extends Enumify {
  static VERTICAL_START = new ScrollBarDir();
  static VERTICAL_END = new ScrollBarDir();
  static HORIZONTAL = new ScrollBarDir();
  static _ = this.closeEnum();
}


/**
 * Memoized React component of a vertical or horizontal scroll bar, used by the scrolling component.
 * This component calls the given prop "onScroll" when the scroll bar handle is moved by the mouse
 * or pointer. If the scrolling direction is horizontal, the value of prop "scrollOffset" and the
 * return value of prop "onScroll" are normalized (>= 0, independent from the browser and from the
 * writing and reading direction)!
 */
const ScrollBar = memo(({
  dir, dimVisible, dimTotal, dimOffset, dimOffsetEnd, scrollOffset, scrollSteps, scrollBarOffset,
  scrollBarOffsetEnd, smoothScrolling, handleOutside, onScroll,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = hooks.useI18n();

  const [isPointerOverHandle, setIsPointerOverHandle] = useState(false);
  const [isHandleMoving, setIsHandleMoving] = useState(false);

  const startScrollOffsetRef = useRef(0);
  const prevScrollOffsetRef = useRef(0);
  const goOnMovingWithEventRef = useRef(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const {
    show, isVertical, dimInvisible, dimInvisibleInSteps, dimScrollHandle, scrollWayFactor,
  } = useMemo(() => {
    const dimVisibleReal = Math.max(0, (dimVisible - dimOffset - dimOffsetEnd));
    const dimScrollWay = Math.max(0, (dimVisible - scrollBarOffset - scrollBarOffsetEnd));
    const res = {};

    res.show = (dimTotal > dimVisibleReal);
    res.isVertical = (dir !== ScrollBarDir.HORIZONTAL);
    // the dimension (width or height) of the not visible part of the container
    res.dimInvisible = dimTotal - dimVisibleReal;
    // the same but in number of steps if given
    res.dimInvisibleInSteps = Math.ceil(res.dimInvisible / scrollSteps) || 0;
    // the dimension (width or height) of the scoll bar handle
    res.dimScrollHandle = Math.max(
      scrollingDefines.scrollBar.handle.minDim,
      (dimVisibleReal * dimScrollWay / dimTotal),
    ) || 0;
    // factor to calculate the offset of the scroll bar handle by a given scroll offset:
    // scroll handle offset = scroll offset * scroll way factor
    res.scrollWayFactor = ((dimScrollWay - res.dimScrollHandle) / res.dimInvisible) || 0;

    return res;
  }, [dir, dimVisible, dimTotal, dimOffset, dimOffsetEnd, scrollSteps, scrollBarOffset, scrollBarOffsetEnd]);

  const isHover = isPointerOverHandle || isHandleMoving;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to build the inline style object for the scroll way element.
   */
  const getScrollWayStyle = () => {
    if (isVertical) {
      return {
        top: `${scrollBarOffset}px`,
        bottom: `${scrollBarOffsetEnd}px`,
      };
    }

    return isRtl ? {
      right: `${scrollBarOffset}px`,
      left: `${scrollBarOffsetEnd}px`,
    } : {
      right: `${scrollBarOffsetEnd}px`,
      left: `${scrollBarOffset}px`,
    };
  };


  /**
   * Helper function to build the inline style object for the scroll handle element.
   */
  const getScrollHandleStyle = () => {
    if (isVertical) {
      const translateY = scrollBarOffset + (scrollOffset * scrollWayFactor);

      return {
        ...(Number.isFinite(dimScrollHandle) && { height: `${Math.floor(dimScrollHandle)}px` }),
        ...(Number.isFinite(translateY) && { transform: `translateY(${translateY}px)` }),
      };
    }

    const translateX = isRtl
      ? scrollBarOffsetEnd + ((dimInvisible - scrollOffset) * scrollWayFactor)
      : scrollBarOffset + (scrollOffset * scrollWayFactor);

    return {
      ...(Number.isFinite(dimScrollHandle) && { width: `${Math.floor(dimScrollHandle)}px` }),
      ...(Number.isFinite(translateX) && { transform: `translateX(${translateX}px)` }),
    };
  };


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const { dragProps } = useDrag({
    onStartDragging: useCallback(() => {
      startScrollOffsetRef.current = scrollOffset;
      prevScrollOffsetRef.current = scrollOffset;
      setIsHandleMoving(true);
    }, [scrollOffset]),
    onStopDragging: useCallback(() => {
      setIsHandleMoving(false);
    }, []),
    onDrag: useCallback((pointerPosX, pointerPosY, pointerDiffX, pointerDiffY, event) => {
      let scrollPos, scrollDiff, steps;

      if (isVertical) {
        scrollPos = startScrollOffsetRef.current + (pointerPosY / scrollWayFactor);
      } else {
        scrollPos = startScrollOffsetRef.current + ((isRtl ? -pointerPosX : pointerPosX) / scrollWayFactor);
      }

      if (scrollSteps <= 0) {
        // -----------------------------------------------------------------------------------------
        // Flowing scrolling: call onScroll with the next value for the scoll offset and
        // additionally with the scroll way difference since the last call as floating point number.
        // -----------------------------------------------------------------------------------------

        scrollPos = Math.max(0, Math.min(dimInvisible, Math.round(scrollPos)));

        if (isVertical) {
          scrollDiff = pointerDiffY / scrollWayFactor;
        } else {
          scrollDiff = (isRtl ? -pointerDiffX : pointerDiffX) / scrollWayFactor;
        }
      } else {
        // -----------------------------------------------------------------------------------------
        // Step-by-step scrolling.
        // -----------------------------------------------------------------------------------------

        steps = Math.max(0, Math.min(dimInvisibleInSteps, Math.floor(scrollPos / scrollSteps)));
        scrollPos = steps * scrollSteps;
        scrollDiff = scrollPos - prevScrollOffsetRef.current;

        prevScrollOffsetRef.current = scrollPos;
      }

      if (scrollDiff !== 0) {
        onScroll(scrollPos, scrollDiff, event);
      }
    }, [scrollSteps, onScroll, isRtl, isVertical, dimInvisible, dimInvisibleInSteps, scrollWayFactor]),
  });


  /**
   * Handler for event "pointer enter" of the scroll way and scroll handle.
   */
  const handlePointerEnter = () => {
    setIsPointerOverHandle(true);
  };


  /**
   * Handler for event "pointer leave" of the scroll way and scroll handle.
   */
  const handlePointerLeave = () => {
    setIsPointerOverHandle(false);
  };


  /**
   * Hanlder for event "pointer down" of the scroll way to directly jump to the clicked position.
   */
  const handleScrollWayPointerDown = (event) => {
    const { top, left, right } = event.target.getBoundingClientRect();
    let jumpPos;

    event.preventDefault(); // if not doing this, text selection will be enabled at mouse move

    if (isVertical) {
      jumpPos = event.clientY - top;
    } else {
      jumpPos = isRtl ? (right - event.clientX) : (event.clientX - left);
    }

    jumpPos = (jumpPos - (dimScrollHandle / 2)) / scrollWayFactor;

    if (scrollSteps <= 0) {
      jumpPos = Math.max(0, Math.min(dimInvisible, Math.round(jumpPos)));
    } else {
      const steps = Math.max(0, Math.min(dimInvisibleInSteps, Math.floor(jumpPos / scrollSteps)));
      jumpPos = Math.min(dimInvisible, steps * scrollSteps);
    }

    const scrollDiff = jumpPos - scrollOffset;

    onScroll(jumpPos, scrollDiff, event);

    // go on with the possibility of moving the scroll handle after the next rendering (see effect
    // below)
    goOnMovingWithEventRef.current = event;
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  const { onPointerDown } = dragProps;

  useEffect(() => {
    if (goOnMovingWithEventRef.current) {
      onPointerDown(goOnMovingWithEventRef.current);
      goOnMovingWithEventRef.current = null;
    }
  }, [onPointerDown]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const scrollWayClasses = classNames(css.scrollWay, {
    [css.show]: show,
    [css.hover]: isHover,
    [css.verticalStart]: (dir === ScrollBarDir.VERTICAL_START),
    [css.verticalEnd]: (dir === ScrollBarDir.VERTICAL_END),
    [css.horizontal]: !isVertical,
    [css.outside]: handleOutside,
  });

  const scrollHandleClasses = classNames(css.scrollHandle, {
    [css.show]: show,
    [css.smoothScrolling]: smoothScrolling,
    [css.verticalStart]: (dir === ScrollBarDir.VERTICAL_START),
    [css.verticalEnd]: (dir === ScrollBarDir.VERTICAL_END),
    [css.horizontal]: !isVertical,
    [css.outside]: handleOutside,
  });

  const scrollHandleInnerClasses = classNames(css.scrollHandleInner, {
    [css.hover]: isHover,
    [css.vertical]: isVertical,
    [css.horizontal]: !isVertical,
  });

  // Note that the scroll handle cannot be a child of the scroll way due to the different opacity
  // values. The CSS property opacity is inherit.
  return (
    <>
      <div
        className={scrollWayClasses}
        style={getScrollWayStyle()}
        onPointerDown={handleScrollWayPointerDown}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      />
      <div
        className={scrollHandleClasses}
        style={getScrollHandleStyle()}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        {...dragProps}
      >
        <div className={scrollHandleInnerClasses} />
      </div>
    </>
  );
  //                                                                                  </editor-fold>
});

ScrollBar.displayName = 'ScrollBar';

ScrollBar.propTypes = {
  dir: PropTypes.instanceOf(ScrollBarDir),
  dimVisible: PropTypes.number.isRequired,
  dimTotal: PropTypes.number.isRequired,
  dimOffset: PropTypes.number,
  dimOffsetEnd: PropTypes.number,
  scrollOffset: PropTypes.number,
  scrollSteps: PropTypes.number,
  scrollBarOffset: PropTypes.number,
  scrollBarOffsetEnd: PropTypes.number,
  smoothScrolling: PropTypes.bool,
  handleOutside: PropTypes.bool,
  onScroll: PropTypes.func,
};

ScrollBar.defaultProps = {
  dir: ScrollBarDir.VERTICAL_END,
  dimOffset: 0,
  dimOffsetEnd: 0,
  scrollOffset: 0,
  scrollSteps: 0,
  scrollBarOffset: 0,
  scrollBarOffsetEnd: 0,
  smoothScrolling: false,
  handleOutside: false,
  onScroll() {},
};

export { ScrollBarDir };
export default ScrollBar;
