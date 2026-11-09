import {
  useCallback, useImperativeHandle, useLayoutEffect, useRef, useState,
} from 'react';

import { color, layout, space } from 'assets/styles';
import { Button, type ButtonProps } from 'components/controls/button';
import { ScrollBar, type ScrollBarProps } from 'components/helpers/scrollBar';
import { useDimensions } from 'components/hooks/useDimensions';
import { useI18n } from 'components/hooks/useI18n';
import { useScrollHandlers, type UseScrollHandlersProps } from 'components/hooks/useScrollHandlers';
import { classNames } from 'utils/classNames';
import {
  convertScrollLeft, scrollLeftDiff, scrollLeftTo, scrollTopDiff, scrollTopTo,
} from 'utils/scroll';

import * as css from './scrolling.scss';
import { type ScrollingProps } from './scrolling.types';
import { Shader } from './shader/Shader';
import { shaderDim as shaderDimExport } from './shader/shader.scss';


const lastPositions: Record<string, { top: number; left: number }> = {};

// The shader's depth, which its stylesheet hands over as a string - the only type css-loader knows
// for an exported value - and which the scroll arithmetic below needs as a number.
const shaderDim = Number(shaderDimExport);


/**
 * React component of the helper component "Scrolling" for the use of vertical and / or horizontal
 * scroll bars and to use touch scrolling.
 */
const Scrolling = ({
  ref, id, tabBarItemId = '', className = '', style, vertical = false, horizontal = false,
  enableKeys = false, showBackToTopButton = false, shaderColor, restoreLastPosition = false,
  scrollToAnchor, onScroll, children,
}: ScrollingProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = useI18n();

  const [scrollPosition, setScrollPosition] = useState({ top: 0, left: 0 });

  const scrollingContainerElemRef = useRef<HTMLDivElement>(null);

  const scrollByStepsFlagXRef = useRef(0);
  const scrollByStepsFlagYRef = useRef(0);
  const wasScrolledRef = useRef(false);
  const prevsRef = useRef<{ scrollToAnchor?: string }>({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const {
    clientWidth, clientHeight, scrollWidth, scrollHeight,
  } = useDimensions({ ref: scrollingContainerElemRef });

  const scrollStepsX = ((typeof horizontal === 'number') && (horizontal > 0)) ? horizontal : 0;
  const scrollStepsY = ((typeof vertical === 'number') && (vertical > 0)) ? vertical : 0;
  let realShaderColor: string | undefined,
    showShaderTop = false,
    showShaderBottom = false,
    showShaderLeft = false,
    showShaderRight = false;

  if (shaderColor && Object.hasOwn(color, shaderColor)) {
    realShaderColor = color[shaderColor as keyof typeof color];
  } else {
    realShaderColor = shaderColor;
  }

  if (realShaderColor) {
    if (vertical && scrollHeight && clientHeight && (scrollHeight > clientHeight)) {
      showShaderTop = (scrollPosition.top > 0);
      showShaderBottom = (scrollPosition.top < (scrollHeight - clientHeight));
    }
    if (horizontal && scrollWidth && clientWidth && (scrollWidth > clientWidth)) {
      showShaderLeft = (scrollPosition.left > 0);
      showShaderRight = (scrollPosition.left < (scrollWidth - clientWidth));
    }
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to overtake the current values of scrollTop and scrollLeft
   * from the scrolling container to the internal state, if they changes. Also call the callback
   * prop onScroll. Note, that scrollLeft is normalized before setting.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const handleSetScrollPosition = useCallback(() => {
    setScrollPosition((prevValue) => {
      if (!scrollingContainerElemRef.current) {
        return prevValue;
      }

      const { scrollTop: top, scrollLeft } = scrollingContainerElemRef.current;
      const left = convertScrollLeft(clientWidth ?? 0, scrollWidth ?? 0, scrollLeft, isRtl);

      if ((top === prevValue.top) && (left === prevValue.left)) {
        return prevValue;
      }

      if (id) {
        lastPositions[id] = { top, left };
      }

      wasScrolledRef.current = true;

      if (typeof onScroll === 'function') {
        onScroll({ top, left });
      }

      return {
        top,
        left,
      };
    });
  }, [id, onScroll, isRtl, clientWidth, scrollWidth]);


  /**
   * Helper function for hook useScrollHandlers to set the given horizontal scroll
   * difference from wheel, touch or keys to the scrolling container.
   */
  const handleChangeX: NonNullable<UseScrollHandlersProps['onChangeX']> = ({ diff }) => {
    if (scrollingContainerElemRef.current) {
      let nextDiff;

      if (scrollStepsX > 0) {
        scrollByStepsFlagXRef.current += (diff / scrollStepsX);
        const steps = Math.floor(scrollByStepsFlagXRef.current);

        scrollByStepsFlagXRef.current -= steps;
        nextDiff = steps * scrollStepsX;
      } else {
        nextDiff = diff;
      }

      scrollLeftDiff(scrollingContainerElemRef.current, nextDiff, {
        isRtl,
        callback: handleSetScrollPosition,
      });
    }
  };


  /**
   * Helper function for hook useScrollHandlers to set the given vertical scroll
   * difference from wheel, touch or keys to the scrolling container.
   */
  const handleChangeY: NonNullable<UseScrollHandlersProps['onChangeY']> = ({ diff }) => {
    if (scrollingContainerElemRef.current) {
      let nextDiff;

      if (scrollStepsY > 0) {
        scrollByStepsFlagYRef.current += (diff / scrollStepsY);
        const steps = Math.floor(scrollByStepsFlagYRef.current);

        scrollByStepsFlagYRef.current -= steps;
        nextDiff = steps * scrollStepsY;
      } else {
        nextDiff = diff;
      }

      scrollTopDiff(scrollingContainerElemRef.current, nextDiff, {
        callback: handleSetScrollPosition,
      });
    }
  };


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    clientLeft: scrollingContainerElemRef.current?.clientLeft,
    clientWidth: scrollingContainerElemRef.current?.clientWidth,
    clientTop: scrollingContainerElemRef.current?.clientTop,
    clientHeight: scrollingContainerElemRef.current?.clientHeight,
    scrollLeft: scrollingContainerElemRef.current?.scrollLeft,
    scrollLeftPercentage: scrollingContainerElemRef.current
      ? Math.round((scrollingContainerElemRef.current.scrollLeft / Math.max(0, (scrollingContainerElemRef.current.scrollWidth - scrollingContainerElemRef.current.clientWidth))) * 100)
      : undefined,
    scrollWidth: scrollingContainerElemRef.current?.scrollWidth,
    scrollTop: scrollingContainerElemRef.current?.scrollTop,
    scrollTopPercentage: scrollingContainerElemRef.current
      ? Math.round((scrollingContainerElemRef.current.scrollTop / Math.max(0, (scrollingContainerElemRef.current.scrollHeight - scrollingContainerElemRef.current.clientHeight))) * 100)
      : undefined,
    scrollHeight: scrollingContainerElemRef.current?.scrollHeight,
    getBoundingClientRect: () => scrollingContainerElemRef.current?.getBoundingClientRect(),
    contains: (other: Node | null) => scrollingContainerElemRef.current?.contains(other),
    scrollToTop: () => {
      if (vertical && scrollingContainerElemRef.current) {
        scrollTopTo(scrollingContainerElemRef.current, 0, {
          callback: handleSetScrollPosition,
        });
      }
    },
    scrollToBottom: () => {
      if (vertical && scrollingContainerElemRef.current) {
        scrollTopTo(scrollingContainerElemRef.current, scrollingContainerElemRef.current.scrollHeight, {
          callback: handleSetScrollPosition,
        });
      }
    },
    scrollVertically: (diff: number) => {
      if (vertical && scrollingContainerElemRef.current) {
        scrollTopDiff(scrollingContainerElemRef.current, diff, {
          callback: handleSetScrollPosition,
        });
      }
    },
    scrollToLeft: () => {
      if (horizontal && scrollingContainerElemRef.current) {
        scrollLeftTo(scrollingContainerElemRef.current, 0, {
          isRtl,
          callback: handleSetScrollPosition,
        });
      }
    },
    scrollToRight: () => {
      if (horizontal && scrollingContainerElemRef.current) {
        scrollLeftTo(scrollingContainerElemRef.current, scrollingContainerElemRef.current.scrollWidth, {
          isRtl,
          callback: handleSetScrollPosition,
        });
      }
    },
    scrollHorizontally: (diff: number) => {
      if (horizontal && scrollingContainerElemRef.current) {
        scrollLeftDiff(scrollingContainerElemRef.current, diff, {
          callback: handleSetScrollPosition,
        });
      }
    },
  }), [vertical, horizontal, isRtl, handleSetScrollPosition]);


  /**
   *
   */
  const scrollHandlersProps = useScrollHandlers<HTMLDivElement>({
    enableWheel: true,
    enableTouch: true,
    ...(enableKeys && clientHeight && {
      enableKeys: true,
      pageKeysScrollSteps: clientHeight * 0.9,
    }),
    ...(horizontal && { onChangeX: handleChangeX }),
    ...(vertical && { onChangeY: handleChangeY }),
  });


  /*
   * Event handler: scrolling vertical by moving the scroll bar handle.
   */
  const handleScrollByVerticalScrollBar: NonNullable<ScrollBarProps['onScroll']> = ({ scrollPos, event }) => {
    if (scrollingContainerElemRef.current) {
      scrollTopTo(scrollingContainerElemRef.current, scrollPos, {
        ...((event.type !== 'pointerdown') && { duration: 0 }),
        easing: 'easeInOutQuad',
        callback: handleSetScrollPosition,
      });
    }
  };


  /*
   * Event handler: scrolling horizontal by moving the scroll bar handle.
   */
  const handleScrollByHorizontalScrollBar: NonNullable<ScrollBarProps['onScroll']> = ({ scrollPos, event }) => {
    if (scrollingContainerElemRef.current) {
      scrollLeftTo(scrollingContainerElemRef.current, scrollPos, {
        isRtl,
        ...((event.type !== 'pointerdown') && { duration: 0 }),
        easing: 'easeInOutQuad',
        callback: handleSetScrollPosition,
      });
    }
  };


  /**
   *
   */
  const handleClickBackToTop: NonNullable<ButtonProps['onClick']> = () => {
    if (scrollingContainerElemRef.current) {
      scrollTopTo(scrollingContainerElemRef.current, 0, {
        callback: handleSetScrollPosition,
      });
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // Layout effect to restore the last position of the last livecycle (or 0), if it was not yet
  // scrolled by wheel, handle, etc. before.
  useLayoutEffect(() => {
    if (!wasScrolledRef.current) {
      let lastTopPosition, lastLeftPosition;

      if (id && restoreLastPosition) {
        lastTopPosition = lastPositions[id]?.top ?? scrollingContainerElemRef.current?.scrollTop ?? 0;
        lastLeftPosition = lastPositions[id]?.left ?? scrollingContainerElemRef.current?.scrollLeft ?? 0;
      } else {
        lastTopPosition = 0;
        lastLeftPosition = 0;
      }

      if (scrollingContainerElemRef.current) {
        scrollTopTo(scrollingContainerElemRef.current, lastTopPosition, {
          duration: 0,
          callback: handleSetScrollPosition,
        });

        scrollLeftTo(scrollingContainerElemRef.current, lastLeftPosition, {
          isRtl,
          duration: 0,
          callback: handleSetScrollPosition,
        });
      }

      if (id && !restoreLastPosition) {
        lastPositions[id] = { top: 0, left: 0 };
      }
    }
  }, [id, restoreLastPosition, isRtl, handleSetScrollPosition]);


  // Layout effect to fit the internal state by the scroll position of the scrolling container, if
  // its dimensions changed (resizing etc.).
  useLayoutEffect(() => {
    handleSetScrollPosition();
  }, [clientWidth, clientHeight, scrollWidth, scrollHeight, handleSetScrollPosition]);


  // Layout effect to reset the flag that indicates, that it was already scrolled, when the ID
  // changed.
  useLayoutEffect(() => () => {
    wasScrolledRef.current = false;
  }, [id]);


  // Layout effect to scroll to the given anchor, if it changed and exists. This effect has no
  // dependency array, because it needs time the element is available in the DOM.
  useLayoutEffect(() => {
    if (
      scrollToAnchor
      && (scrollToAnchor !== prevsRef.current.scrollToAnchor)
      && scrollingContainerElemRef.current
    ) {
      const elem = document.getElementById(scrollToAnchor);

      if (elem) {
        scrollTopDiff(
          scrollingContainerElemRef.current,
          elem.getBoundingClientRect().top - scrollingContainerElemRef.current.getBoundingClientRect().top - shaderDim,
          { callback: handleSetScrollPosition },
        );

        prevsRef.current.scrollToAnchor = scrollToAnchor;
      }
    }
  });


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const scrollingWrapperClasses = classNames(css.scrollingWrapper, className);

  return (
    <div
      {...(id && { id })}
      {...(tabBarItemId && { role: 'tabpanel', 'aria-labelledby': tabBarItemId })}
      className={scrollingWrapperClasses}
      style={style}
      {...scrollHandlersProps}
    >
      <div ref={scrollingContainerElemRef} className={css.scrollingContr}>
        {children}
      </div>
      {showShaderTop && <Shader pos="top" color={realShaderColor!} />}
      {showShaderBottom && <Shader pos="bottom" color={realShaderColor!} />}
      {showShaderLeft && <Shader pos="left" color={realShaderColor!} />}
      {showShaderRight && <Shader pos="right" color={realShaderColor!} />}
      {!!vertical && (
        <ScrollBar
          dir="verticalEnd"
          dimVisible={clientHeight ?? 0}
          dimTotal={scrollHeight ?? 0}
          scrollOffset={scrollPosition.top}
          scrollSteps={scrollStepsY}
          onScroll={handleScrollByVerticalScrollBar}
        />
      )}
      {!!horizontal && (
        <ScrollBar
          dir="horizontal"
          dimVisible={clientWidth ?? 0}
          dimTotal={scrollWidth ?? 0}
          scrollOffset={scrollPosition.left}
          scrollSteps={scrollStepsX}
          onScroll={handleScrollByHorizontalScrollBar}
        />
      )}
      {showBackToTopButton && vertical && (scrollPosition.top > 0) && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <Button
          type="overlaid"
          {...(isRtl ? { left: layout.scrolling.scrollBarThickness + space.xxs } : { right: layout.scrolling.scrollBarThickness + space.xxs })}
          bottom={space.small}
          icon="NAVITOP"
          onClick={handleClickBackToTop}
        />
      )}
    </div>
  );
  //                                                                                  </editor-fold>
};

Scrolling.displayName = 'Scrolling';


export { Scrolling };
