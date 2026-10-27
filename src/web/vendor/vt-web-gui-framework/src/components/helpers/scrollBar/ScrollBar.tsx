import { useEffect, useRef, useState } from 'react';

import { layout, space } from 'assets/styles';
import { useDrag } from 'components/hooks/useDrag';
import { useI18n } from 'components/hooks/useI18n';

import type { DerivedScrollValues, ScrollBarProps, ScrollBarStatus } from './scrollBar.types';
import { ScrollHandle } from './scrollHandle/ScrollHandle';
import { ScrollWay } from './scrollWay/ScrollWay';


// The shortest the handle gets, however long the content it scrolls.
const scrollHandleMinDim = space.large;


/**
 * React component of the helper component "ScrollBar", a vertical or horizontal scroll bar. This
 * component calls the given prop "onScroll" when the scroll bar handle is moved by the pointer. If
 * the scrolling direction is horizontal, the value of prop "scrollOffset" and the return value of
 * prop "onScroll" are normalized (\>= 0, independent from the browser and from the writing and
 * reading direction)!
 */
const ScrollBar = ({
  dir = 'verticalEnd', dimVisible, dimTotal, dimOffset = 0, dimOffsetEnd = 0, scrollOffset = 0,
  scrollSteps = 0, scrollBarOffset = 0, scrollBarOffsetEnd = 0, smoothScrolling = false,
  handleOutside = false, onScroll,
}: ScrollBarProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = useI18n();

  const [isPointerOverHandle, setIsPointerOverHandle] = useState(false);
  const [isHandleDragged, setIsHandleDragged] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const scrollOffsetAtStartDraggingRef = useRef(0);
  const jumpToScrollPosRef = useRef<number | null>(null);
  const isScrollingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevsRef = useRef({ scrollOffset, scrollPos: 0 });


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to derive whether the scroll bar shows, its direction, and the dimensions of
   * the handle and of the way it moves on.
   */
  const deriveScrollValues = (): DerivedScrollValues => {
    const dimVisReal = Math.max(0, (dimVisible - dimOffset - dimOffsetEnd));
    const dimScrWay = Math.max(0, (dimVisible - scrollBarOffset - scrollBarOffsetEnd));
    const dimInvis = dimTotal - dimVisReal;
    const dimScrHndl = Math.max(
      scrollHandleMinDim,
      (dimVisReal * dimScrWay / dimTotal),
    );

    if (
      (dimTotal <= dimVisReal)
      || !Number.isFinite(dimScrHndl)
    ) {
      return {
        show: false,
        isVertical: (dir !== 'horizontal'),
        dimInvisible: 0,
        dimInvisibleInSteps: 0,
        dimScrollHandle: 0,
        scrollWayFactor: 0,
      };
    }

    return {
      show: true,
      isVertical: (dir !== 'horizontal'),
      dimInvisible: dimInvis,
      dimInvisibleInSteps: (scrollSteps > 0) ? Math.ceil(dimInvis / scrollSteps) : 0,
      dimScrollHandle: Math.floor(dimScrHndl),
      scrollWayFactor: (dimScrWay - dimScrHndl) / dimInvis,
    };
  };


  const {
    show, isVertical, dimInvisible, dimInvisibleInSteps, dimScrollHandle, scrollWayFactor,
  } = deriveScrollValues();


  let posScrollHandle,
    status: ScrollBarStatus;

  if (isVertical) {
    posScrollHandle = Math.floor(scrollBarOffset + (scrollOffset * scrollWayFactor));
  } else {
    posScrollHandle = Math.floor(isRtl
      ? scrollBarOffsetEnd + ((dimInvisible - scrollOffset) * scrollWayFactor)
      : scrollBarOffset + (scrollOffset * scrollWayFactor));
  }

  if (isPointerOverHandle || isHandleDragged) {
    status = 'hover';
  } else if (isScrolling) {
    status = 'scrolling';
  } else {
    status = 'inactive';
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const { dragProps: { onPointerDown } } = useDrag<HTMLDivElement>({
    onStartDragging: () => {
      if (jumpToScrollPosRef.current === null) {
        scrollOffsetAtStartDraggingRef.current = scrollOffset;
        prevsRef.current.scrollPos = scrollOffset;
      } else {
        scrollOffsetAtStartDraggingRef.current = jumpToScrollPosRef.current;
        prevsRef.current.scrollPos = jumpToScrollPosRef.current;
        jumpToScrollPosRef.current = null;
      }

      setIsHandleDragged(true);
    },
    onStopDragging: () => {
      setIsHandleDragged(false);
    },
    onDrag: ({
      posX, posY, diffX, diffY, event,
    }) => {
      let scrollPos, scrollDiff, steps;

      if (isVertical) {
        scrollPos = scrollOffsetAtStartDraggingRef.current + (posY / scrollWayFactor);
      } else {
        scrollPos = scrollOffsetAtStartDraggingRef.current + ((isRtl ? -posX : posX) / scrollWayFactor);
      }

      if (scrollSteps <= 0) {
        // -----------------------------------------------------------------------------------------
        // Flowing scrolling: call onScroll with the next value for the scoll offset and
        // additionally with the scroll way difference since the last call as floating point number.
        // -----------------------------------------------------------------------------------------

        scrollPos = Math.max(0, Math.min(dimInvisible, Math.round(scrollPos)));

        if (isVertical) {
          scrollDiff = diffY / scrollWayFactor;
        } else {
          scrollDiff = (isRtl ? -diffX : diffX) / scrollWayFactor;
        }
      } else {
        // -----------------------------------------------------------------------------------------
        // Step-by-step scrolling.
        // -----------------------------------------------------------------------------------------

        steps = Math.max(0, Math.min(dimInvisibleInSteps, Math.floor(scrollPos / scrollSteps)));
        scrollPos = steps * scrollSteps;
        scrollDiff = scrollPos - prevsRef.current.scrollPos;

        prevsRef.current.scrollPos = scrollPos;
      }

      if (scrollDiff !== 0) {
        onScroll?.({ scrollPos, scrollDiff, event });
      }
    },
  });


  /**
   * Handler for the callback prop "onPointerEnter" of the sub-components "ScrollWay" and
   * "ScrollHandle".
   */
  const handlePointerEnter = () => {
    setIsPointerOverHandle(true);
  };


  /**
   * Handler for the callback prop "onPointerLeave" of the sub-components "ScrollWay" and
   * "ScrollHandle"
   */
  const handlePointerLeave = () => {
    setIsPointerOverHandle(false);
  };


  /**
   * Handler for the callback prop "onPointerDownAtPos" of the sub-component "ScrollWay" to directly
   * jump to the clicked position.
   */
  const handleScrollWayPointerDownAtPos: React.ComponentProps<typeof ScrollWay>['onPointerDownAtPos'] = ({ pos, event }) => {
    let scrollPos = (pos - (dimScrollHandle / 2)) / scrollWayFactor;

    if (scrollSteps <= 0) {
      scrollPos = Math.max(0, Math.min(dimInvisible, Math.round(scrollPos)));
    } else {
      const steps = Math.max(0, Math.min(dimInvisibleInSteps, Math.floor(scrollPos / scrollSteps)));
      scrollPos = Math.min(dimInvisible, steps * scrollSteps);
    }

    const scrollDiff = scrollPos - scrollOffset;

    onScroll?.({ scrollPos, scrollDiff, event });

    // go on with the possibility of moving the scroll handle
    jumpToScrollPosRef.current = scrollPos;
    onPointerDown(event);
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (scrollOffset !== prevsRef.current.scrollOffset) {
      prevsRef.current.scrollOffset = scrollOffset;
      clearTimeout(isScrollingTimeoutRef.current);

      setIsScrolling(true);

      isScrollingTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, layout.animationTime.slowMs);
    }
  }, [scrollOffset, isHandleDragged]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!show) {
    return null;
  }


  // Note that the scroll handle cannot be a child of the scroll way due to the different opacity
  // values. The CSS property opacity is inherit.
  return (
    <>
      <ScrollWay
        dir={dir}
        isRtl={isRtl}
        posStart={scrollBarOffset}
        posEnd={scrollBarOffsetEnd}
        handleOutside={handleOutside}
        status={status}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDownAtPos={handleScrollWayPointerDownAtPos}
      />
      <ScrollHandle
        dir={dir}
        dim={dimScrollHandle}
        pos={posScrollHandle}
        handleOutside={handleOutside}
        smoothScrolling={smoothScrolling}
        status={status}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={onPointerDown}
      />
    </>
  );
  //                                                                                  </editor-fold>
};

ScrollBar.displayName = 'ScrollBar';


export { ScrollBar };
