import PropTypes from 'prop-types';
import {
  forwardRef, useState, useRef, useImperativeHandle, useCallback, useLayoutEffect,
} from 'react';

import Enums from 'assets/enums';
import useDimensions from 'components/hooks/useDimensions';
import { hooks } from 'store';
import classNames from 'utils/classNames';

import ScrollBar, { ScrollBarDir } from './scrollBar';
import ScrollButton from './scrollButton';
import Shader from './shader';
import {
  convertScrollLeft, convertScrollLeftOfElement, scrollTopTo, scrollTopDiff, scrollLeftTo, scrollLeftDiff,
} from './scroll';
import css from './scrolling.scss';
import useScrollHandlers from './useScrollHandlers';


const lastPositions = {};


/**
 * React component for the use of vertical and / or horizontal scroll bars and to use touch
 * scrolling.
 */
const Scrolling = forwardRef(({
  className, style, id, vertical, horizontal, enableKeys, shaderColor, restoreLastPosition,
  onScroll, children,
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = hooks.useI18n();

  const [scrollPosition, setScrollPosition] = useState({ top: 0, left: 0 });

  const scrollingWrapperRef = useRef();
  const scrollingContrRef = useRef();
  const scrollByStepsFlagXRef = useRef(0);
  const scrollByStepsFlagYRef = useRef(0);
  const wasScrolledRef = useRef(false);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const {
    clientWidth, clientHeight, scrollWidth, scrollHeight,
  } = useDimensions(scrollingContrRef);

  const scrollStepsX = ((typeof horizontal === 'number') && (horizontal > 0)) ? horizontal : 0;
  const scrollStepsY = ((typeof vertical === 'number') && (vertical > 0)) ? vertical : 0;
  let showShaderTop, showShaderBottom, showShaderLeft, showShaderRight;

  if ((shaderColor !== Enums.BackgroundColor.NONE) && (shaderColor !== '')) {
    if (vertical && (scrollHeight > clientHeight)) {
      showShaderTop = (scrollPosition.top > 0);
      showShaderBottom = (scrollPosition.top < (scrollHeight - clientHeight));
    }
    if (horizontal && (scrollWidth > clientWidth)) {
      showShaderLeft = (scrollPosition.left > 0);
      showShaderBottom = (scrollPosition.left < (scrollWidth - clientWidth));
    }
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Memoized helper function to overtake the current values of scrollTop and scrollLeft from the
   * scrolling container to the internal state, if they changes. Also call the callback prop
   * onScroll. Note, that scrollLeft is normalized before setting.
   */
  const handleSetScrollPosition = useCallback(() => {
    setScrollPosition((prevValue) => {
      const { scrollTop: top, scrollLeft } = scrollingContrRef.current;
      const left = convertScrollLeft(clientWidth, scrollWidth, scrollLeft, isRtl);

      if ((top === prevValue.top) && (left === prevValue.left)) {
        return prevValue;
      }

      onScroll({ top, left });

      return {
        top,
        left,
      };
    });
  }, [onScroll, isRtl, clientWidth, scrollWidth]);


  /**
   * Memoized helper function for hook useScrollHandlers to set the given horizontal scroll
   * difference from wheel, touch or keys to the scrolling container.
   */
  const handleChangeX = useCallback((delta) => {
    let diff;

    if (scrollStepsX > 0) {
      scrollByStepsFlagXRef.current += (delta / scrollStepsX);
      const steps = Math.floor(scrollByStepsFlagXRef.current);

      scrollByStepsFlagXRef.current -= steps;
      diff = steps * scrollStepsX;
    } else {
      diff = delta;
    }

    scrollLeftDiff(scrollingContrRef.current, diff, {
      isRtl,
      callback: handleSetScrollPosition,
    });

    wasScrolledRef.current = true;
  }, [isRtl, scrollStepsX, handleSetScrollPosition]);


  /**
   * Memoized helper function for hook useScrollHandlers to set the given vertical scroll difference
   * from wheel, touch or keys to the scrolling container.
   */
  const handleChangeY = useCallback((delta) => {
    let diff;

    if (scrollStepsY > 0) {
      scrollByStepsFlagYRef.current += (delta / scrollStepsY);
      const steps = Math.floor(scrollByStepsFlagYRef.current);

      scrollByStepsFlagYRef.current -= steps;
      diff = steps * scrollStepsY;
    } else {
      diff = delta;
    }

    scrollTopDiff(scrollingContrRef.current, diff, {
      callback: handleSetScrollPosition,
    });

    wasScrolledRef.current = true;
  }, [scrollStepsY, handleSetScrollPosition]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    getScrollDims: () => {
      const cW = scrollingContrRef.current.clientWidth;
      const sW = scrollingContrRef.current.scrollWidth;
      const sL = scrollingContrRef.current.scrollLeft;
      const scrollWayX = Math.max(0, (sW - cW));
      const cH = scrollingContrRef.current.clientHeight;
      const sH = scrollingContrRef.current.scrollHeight;
      const sT = scrollingContrRef.current.scrollTop;
      const scrollWayY = Math.max(0, (sH - cH));

      return {
        clientHeight: cH,
        scrollHeight: sH,
        scrollTop: sT,
        scrollTopPercentage: scrollWayY ? Math.round((sT / scrollWayY) * 100) : 0,
        clientWidth: cW,
        scrollWidth: sW,
        scrollLeft: sL,
        scrollLeftPercentage: scrollWayX ? Math.round((sL / scrollWayX) * 100) : 0,
      };
    },
    scrollToTop: () => {
      if (vertical) {
        scrollTopTo(scrollingContrRef.current, 0, {
          callback: handleSetScrollPosition,
        });

        wasScrolledRef.current = true;
      }
    },
    scrollToBottom: () => {
      if (vertical) {
        scrollTopTo(scrollingContrRef.current, scrollingContrRef.current.scrollHeight, {
          callback: handleSetScrollPosition,
        });

        wasScrolledRef.current = true;
      }
    },
    scrollToLeft: () => {
      if (horizontal) {
        scrollLeftTo(scrollingContrRef.current, 0, {
          isRtl,
          callback: handleSetScrollPosition,
        });

        wasScrolledRef.current = true;
      }
    },
    scrollToRight: () => {
      if (horizontal) {
        scrollLeftTo(scrollingContrRef.current, scrollingContrRef.current.scrollWidth, {
          isRtl,
          callback: handleSetScrollPosition,
        });

        wasScrolledRef.current = true;
      }
    },
    contains: (...args) => scrollingWrapperRef.current.contains(...args),
    getBoundingClientRect: () => scrollingWrapperRef.current.getBoundingClientRect(),
  }), [vertical, horizontal, isRtl, handleSetScrollPosition]);


  /**
   *
   */
  const scrollHandlersProps = useScrollHandlers({
    enableWheel: true,
    enableTouch: true,
    ...(enableKeys && scrollingContrRef.current?.clientHeight && {
      enableKeys: true,
      pageKeysScrollSteps: scrollingContrRef.current.clientHeight * 0.9,
    }),
    ...(horizontal && { onChangeX: handleChangeX }),
    ...(vertical && { onChangeY: handleChangeY }),
  });


  /*
   * Event handler: scrolling vertical by moving the scroll bar handle.
   */
  const handleScrollByVerticalScrollBar = useCallback((value, diff, event) => {
    scrollTopTo(scrollingContrRef.current, value, {
      ...((event.type !== 'pointerdown') && { duration: 0 }),
      easing: 'easeInOutQuad',
      callback: handleSetScrollPosition,
    });

    wasScrolledRef.current = true;
  }, [handleSetScrollPosition]);


  /*
   * Event handler: scrolling horizontal by moving the scroll bar handle.
   */
  const handleScrollByHorizontalScrollBar = useCallback((value, diff, event) => {
    scrollLeftTo(scrollingContrRef.current, value, {
      isRtl,
      ...((event.type !== 'pointerdown') && { duration: 0 }),
      easing: 'easeInOutQuad',
      callback: handleSetScrollPosition,
    });

    wasScrolledRef.current = true;
  }, [isRtl, handleSetScrollPosition]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // Layout effect to restore the last position of the last livecycle (or 0), if it was not yet
  // scrolled by wheel, handle,... before.
  useLayoutEffect(() => {
    if (!wasScrolledRef.current) {
      let lastTopPosition, lastLeftPosition;

      if (restoreLastPosition) {
        lastTopPosition = lastPositions[id]?.top ?? scrollingContrRef.current?.scrollTop ?? 0;
        lastLeftPosition = lastPositions[id]?.left ?? scrollingContrRef.current?.scrollLeft ?? 0;
      } else {
        lastTopPosition = 0;
        lastLeftPosition = 0;
      }

      scrollTopTo(scrollingContrRef.current, lastTopPosition, {
        duration: 0,
        callback: handleSetScrollPosition,
      });

      scrollLeftTo(scrollingContrRef.current, lastLeftPosition, {
        isRtl,
        duration: 0,
        callback: handleSetScrollPosition,
      });
    }
  }, [id, restoreLastPosition, isRtl, handleSetScrollPosition]);


  // Layout effect to fit the internal state by the scroll position of the scrolling container, if
  // its dimensions changed (resizing etc.).
  useLayoutEffect(() => {
    handleSetScrollPosition();
  }, [clientWidth, clientHeight, scrollWidth, scrollHeight, handleSetScrollPosition]);


  // Layout effect to save the last position at the end of the lifecycle or before the ID changed.
  // Also reset the flag that indicates, that it was already scrolled.
  useLayoutEffect(() => () => {
    if (id) {
      lastPositions[id] = {
        top: scrollingContrRef.current?.scrollTop ?? 0,
        left: scrollingContrRef.current?.scrollLeft ?? 0,
      };

      wasScrolledRef.current = false;
    }
  }, [id]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const scrollingWrapperClasses = classNames(css.scrollingWrapper, {
    [className]: className,
  });

  return (
    <div
      ref={scrollingWrapperRef}
      className={scrollingWrapperClasses}
      style={style}
      {...scrollHandlersProps}
    >
      <div ref={scrollingContrRef} className={css.scrollingContr}>
        {children}
      </div>
      {showShaderTop && (<Shader pos={Enums.Position.TOP} color={shaderColor} />)}
      {showShaderBottom && (<Shader pos={Enums.Position.BOTTOM} color={shaderColor} />)}
      {showShaderLeft && (<Shader pos={Enums.Position.LEFT} color={shaderColor} />)}
      {showShaderRight && (<Shader pos={Enums.Position.RIGHT} color={shaderColor} />)}
      {vertical && (
        <ScrollBar
          dir={ScrollBarDir.VERTICAL_END}
          dimVisible={clientHeight}
          dimTotal={scrollHeight}
          scrollOffset={scrollPosition.top}
          scrollSteps={scrollStepsY}
          onScroll={handleScrollByVerticalScrollBar}
        />
      )}
      {horizontal && (
        <ScrollBar
          dir={ScrollBarDir.HORIZONTAL}
          dimVisible={clientWidth}
          dimTotal={scrollWidth}
          scrollOffset={scrollPosition.left}
          scrollSteps={scrollStepsX}
          onScroll={handleScrollByHorizontalScrollBar}
        />
      )}
    </div>
  );
  //                                                                                  </editor-fold>
});

Scrolling.displayName = 'Scrolling';

Scrolling.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  vertical: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
  horizontal: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
  enableKeys: PropTypes.bool,
  shaderColor: PropTypes.oneOfType([PropTypes.instanceOf(Enums.BackgroundColor), PropTypes.string]),
  restoreLastPosition: PropTypes.bool,
  onScroll: PropTypes.func,
  children: PropTypes.node,
};

Scrolling.defaultProps = {
  className: '',
  style: {},
  id: '',
  vertical: false,
  horizontal: false,
  enableKeys: false,
  shaderColor: Enums.BackgroundColor.NONE,
  restoreLastPosition: false,
  onScroll() {},
  children: null,
};

export {
  ScrollBar, ScrollBarDir, ScrollButton, useScrollHandlers, convertScrollLeft,
  convertScrollLeftOfElement, scrollTopTo, scrollTopDiff, scrollLeftTo, scrollLeftDiff,
};
export default Scrolling;
