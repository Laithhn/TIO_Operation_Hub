import {
  useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';

import { selectViewportHeight, selectViewportWidth } from 'app/app.slice';
import { Scrolling, type ScrollingHandle } from 'components/helpers/scrolling';
import { useSelector } from 'components/hooks/useSelector';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';

import * as css from './card.scss';
import { type CardProps, cardStylingProps } from './card.types';


const domChangeTolerance = 5;
const numToPx = (value: number) => ((value === 0) ? 0 : `${value}px`);
const portalCntr = document.getElementById(process.env['ELEM_ID_TEMP'] ?? '');


/**
 * React component of the popup component "Card".
 *
 * A card carries glass as its ground: a nearly opaque fill of the palette's "offWhite" with a
 * denser edge and a blur of what lies behind it. It is light whatever it covers, and its content
 * letters itself for that light ground; a different colour comes from a section placed inside.
 *
 * A card without a height of its own is as tall as its content and no taller than the room the
 * viewport leaves it - for content that has a height of its own. A scrolling section inside it
 * contributes none: what it scrolls lies outside the flow, so the section takes the room it is
 * given and asks for nothing. A card that is to scroll such a section therefore states its height
 * itself - measured or computed, as every popup of a control does - and the card caps it at the
 * room; the columns selection card of the data table shows the measuring.
 */
const Card = ({
  ref, id, show, left, right, width, top, bottom, height, insertInPlace = false,
  anchorElemRef, placeBesideAnchorElem = false, softAnchor = false, scrollBarV = false,
  scrollBarH = false, onClick, onPointerDown, onPointerUp, onKeyDown, onClickBeside, onPressEscape,
  onMoveAnchorElem, children, ...restProps
}: CardProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const viewportWidth = useSelector(selectViewportWidth);
  const viewportHeight = useSelector(selectViewportHeight);

  const [anchorElemRect, setAnchorElemRect] = useState<DOMRect>();
  const [cardRect, setCardRect] = useState<DOMRect>();

  const cardElemRef = useRef<HTMLDivElement>(null);
  const scrollingHandleRef = useRef<ScrollingHandle>(null);

  const prevsRef = useRef<{ viewportHeight: number; viewportWidth: number; anchorElemRect: DOMRect | undefined }>({
    viewportHeight,
    viewportWidth,
    anchorElemRect: undefined,
  });


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle, innerElemStyle } = useStylingProps(restProps, cardStylingProps);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to derive the card's style and placement from the position props, the viewport
   * and the rectangles of the card and its anchor element.
   */
  const deriveCardPlacement = () => {
    // Priority rules: if prop "left" is set to "center", then prop "right" is ignored. Prop "width"
    // has priority over "right", if "left" is set too.
    const isLeftNumber = (typeof left === 'number');
    const isCenterH = ((typeof left === 'string') && (left.toLowerCase() === 'center'));
    const takeLeft = isLeftNumber && (left >= 0);
    const takeWidth = (width !== undefined) && (width >= 0);
    const takeRight = !isCenterH && !(takeLeft && takeWidth) && (right !== undefined) && (right >= 0);
    // Priority rules: if prop "top" is set to "center", then prop "bottom" is ignored. Prop
    // "height" has priority over "bottom", if "top" is set too.
    const isTopNumber = (typeof top === 'number');
    const isCenterV = ((typeof top === 'string') && (top.toLowerCase() === 'center'));
    const takeTop = isTopNumber && (top >= 0);
    const takeHeight = (height !== undefined) && (height >= 0);
    const takeBottom = !isCenterV && !(takeTop && takeHeight) && (bottom !== undefined) && (bottom >= 0);

    // the distances to the left and right viewport borders
    const distLeft = (isLeftNumber && (left < 0)) ? -left : 0;
    const distRight = (isLeftNumber && (right !== undefined) && (right < 0)) ? -right : 0;
    // since one of the two positions is set, only the other can be used as distance (> 0)
    const distH = distLeft + distRight;

    // the distances to the top and bottom viewport borders
    const distTop = (isTopNumber && (top < 0)) ? -top : 0;
    const distBottom = (isTopNumber && (bottom !== undefined) && (bottom < 0)) ? -bottom : 0;
    // since one of the two positions is set, only the other can be used as distance (> 0)
    const distV = distTop + distBottom;
    const usedAnchorElemDimsArr: ('left' | 'right' | 'top' | 'bottom')[] = [];

    const res: {
      cardStyle: React.CSSProperties; isPlacedOutside: boolean; isScrollingPossible: boolean; usedAnchorElemDims: string;
    } = {
      cardStyle: outerElemStyle,
      isPlacedOutside: false,
      isScrollingPossible: false,
      usedAnchorElemDims: '',
    };
    let isScrollingHPossible = false,
      isScrollingVPossible = false;

    // ---------------------------------------------------------------------------------------------
    if (isCenterH) {
    // ---------------------------------------------------------------------------------------------

      // X position: center in the middle of the viewport. Scrolling in this direction is possible
      // if a width is given.

      res.cardStyle = {
        ...res.cardStyle,
        left: (viewportWidth - (cardRect?.width ?? 0)) / 2,
        ...(takeWidth && { width: Math.min(viewportWidth, width) }),
        ...(!cardRect?.width && { visibility: 'hidden' }),
      };
      isScrollingHPossible = takeWidth;

    // ---------------------------------------------------------------------------------------------
    } else if (takeLeft && takeRight) {
    // ---------------------------------------------------------------------------------------------

      // X position with left and right as fixpoints. Scrolling in this direction is possible.

      res.cardStyle = {
        ...res.cardStyle,
        left: numToPx(left),
        right: numToPx(right),
        width: 'initial',
      };
      isScrollingHPossible = true;

    // ---------------------------------------------------------------------------------------------
    } else if (takeLeft || takeRight) {
    // ---------------------------------------------------------------------------------------------

      const maxWidth = viewportWidth - (takeLeft ? left : right!) - distH;

      if (takeWidth) {
        if (softAnchor && (width > maxWidth)) {
          // X position with left or right and with the width as fixpoints, but it is not enough
          // space: move the left or right position. Scrolling in this direction is possible.

          const movedPos = Math.max(0, (viewportWidth - width - distH));

          res.cardStyle = {
            ...res.cardStyle,
            ...(takeLeft
              ? {
                left: numToPx(movedPos),
                right: numToPx(distH),
              }
              : {
                left: numToPx(distH),
                right: numToPx(movedPos),
              }),
            width: 'initial',
          };
        } else {
          // X position with left or right and with the width as fixpoints: do not move the left or
          // right position if the space is too small. Limit the width to the maximum of the
          // available width. Scrolling in this direction is possible.

          res.cardStyle = {
            ...res.cardStyle,
            ...(takeLeft ? { left: numToPx(left) } : { right: numToPx(right!) }),
            width: numToPx(Math.min(maxWidth, width)),
          };
        }

        isScrollingHPossible = true;
      } else {
        // X position with left or right as fixpoint. The width will be set automatically, limited
        // to the maximum of the available width. Scrolling in this direction is NOT possible.

        res.cardStyle = {
          ...res.cardStyle,
          ...(takeLeft ? { left: numToPx(left) } : { right: numToPx(right!) }),
          maxWidth: numToPx(maxWidth),
          width: 'initial',
        };
      }

    // ---------------------------------------------------------------------------------------------
    } else if (anchorElemRect) {
    // ---------------------------------------------------------------------------------------------

      const rightwards = ((viewportWidth - anchorElemRect.right - distRight) > (anchorElemRect.left - distLeft));
      const refDim = (rightwards !== placeBesideAnchorElem) ? 'left' : 'right';
      const maxWidth = rightwards
        ? (viewportWidth - anchorElemRect[refDim] - distRight)
        : (anchorElemRect[refDim] - distLeft);

      usedAnchorElemDimsArr.push(refDim);

      if (takeWidth) {
        if (softAnchor && (width > maxWidth)) {
          // X position with two fixpoints: the position of the anchor element and the width, but it
          // is not enough space, so move the left or right position over the anchor. Scrolling in
          // this direction is possible.

          res.cardStyle = {
            ...res.cardStyle,
            ...(rightwards
              ? {
                left: numToPx(Math.max(distLeft, (viewportWidth - width - distRight))),
                right: numToPx(distRight),
              }
              : {
                left: numToPx(distLeft),
                right: numToPx(Math.max(distRight, (viewportWidth - width - distLeft))),
              }),
            width: 'initial',
          };
        } else {
          // X position with two fixpoints: the position of the anchor element and the width, but do
          // not move the left or right position if the space is too small. Limit the width to the
          // maximum of the available width. Scrolling in this direction is possible.

          res.cardStyle = {
            ...res.cardStyle,
            ...(rightwards
              ? { left: numToPx(anchorElemRect[refDim]) }
              : { right: numToPx(viewportWidth - anchorElemRect[refDim]) }
            ),
            width: numToPx(Math.min(maxWidth, width)),
          };

          // Here it may happen, that the card is placed outside of the viewport.
          res.isPlacedOutside = (anchorElemRect[refDim] < 0) || (anchorElemRect[refDim] > viewportWidth);
        }

        isScrollingHPossible = true;
      } else {
        // X position with one fixpoint: the position of the anchor element. The width will be set
        // automatically, limited to the maximum of the available width. Scrolling in this
        // direction is NOT possible.

        res.cardStyle = {
          ...res.cardStyle,
          ...(rightwards
            ? { left: numToPx(anchorElemRect[refDim]) }
            : { right: numToPx(viewportWidth - anchorElemRect[refDim]) }
          ),
          maxWidth: numToPx(maxWidth),
          width: 'initial',
        };

        // Here it may happen, that the card is placed outside of the viewport.
        res.isPlacedOutside = (anchorElemRect[refDim] < 0) || (anchorElemRect[refDim] > viewportWidth);
      }

    // ---------------------------------------------------------------------------------------------
    } else {
    // ---------------------------------------------------------------------------------------------

      // X position without any fixpoints: take the given width or the complete width of the
      // viewport. Scrolling in this direction is possible.

      res.cardStyle = {
        ...res.cardStyle,
        left: numToPx(distLeft),
        width: numToPx(takeWidth
          ? Math.min((viewportWidth - distH), width)
          : (viewportWidth - distH)),
      };
      isScrollingHPossible = true;
    }


    // ---------------------------------------------------------------------------------------------
    if (isCenterV) {
    // ---------------------------------------------------------------------------------------------

      // Y position: center in the middle of the viewport. Scrolling in this direction is possible
      // if a height is given.

      res.cardStyle = {
        ...res.cardStyle,
        top: (viewportHeight - (cardRect?.height ?? 0)) / 2,
        ...(takeHeight && { height: Math.min(viewportHeight, height) }),
        ...(!cardRect?.height && { visibility: 'hidden' }),
      };

      isScrollingVPossible = takeHeight;

    // ---------------------------------------------------------------------------------------------
    } else if (takeTop && takeBottom) {
    // ---------------------------------------------------------------------------------------------

      // Y position with top and bottom as fixpoints. Scrolling in this direction is possible.

      res.cardStyle = {
        ...res.cardStyle,
        top: numToPx(top),
        bottom: numToPx(bottom),
        height: 'initial',
      };
      isScrollingVPossible = true;

    // ---------------------------------------------------------------------------------------------
    } else if (takeTop || takeBottom) {
    // ---------------------------------------------------------------------------------------------

      const maxHeight = viewportHeight - (takeTop ? top : bottom!) - distV;

      if (takeHeight) {
        if (softAnchor && (height > maxHeight)) {
          // Y position with top or bottom and with the height as fixpoints, but it is not enough
          // space: move the top or height position. Scrolling in this direction is possible.

          const movedPos = Math.max(0, (viewportHeight - height - distV));

          res.cardStyle = {
            ...res.cardStyle,
            ...(takeTop
              ? {
                top: numToPx(movedPos),
                bottom: numToPx(distV),
              }
              : {
                top: numToPx(distV),
                bottom: numToPx(movedPos),
              }),
            height: 'initial',
          };
        } else {
          // Y position with top or bottom and with the height as fixpoints: do not move the top or
          // bottom position if the space is too small. Limit the height to the maximum of the
          // available height. Scrolling in this direction is possible.

          res.cardStyle = {
            ...res.cardStyle,
            ...(takeTop ? { top: numToPx(top) } : { bottom: numToPx(bottom!) }),
            height: numToPx(Math.min(maxHeight, height)),
          };
        }

        isScrollingVPossible = true;
      } else {
        // Y position with top or bottom as fixpoint. The height will be set automatically, limited
        // to the maximum of the available height. Scrolling in this direction is NOT possible.

        res.cardStyle = {
          ...res.cardStyle,
          ...(takeTop ? { top: numToPx(top) } : { bottom: numToPx(bottom!) }),
          maxHeight: numToPx(maxHeight),
          height: 'initial',
        };
      }

    // ---------------------------------------------------------------------------------------------
    } else if (anchorElemRect) {
    // ---------------------------------------------------------------------------------------------

      const upwards = ((anchorElemRect.top - distTop) > (viewportHeight - anchorElemRect.bottom - distBottom));
      const refDim = (upwards !== placeBesideAnchorElem) ? 'top' : 'bottom';
      const maxHeight = upwards
        ? (anchorElemRect[refDim] - distTop)
        : (viewportHeight - anchorElemRect[refDim] - distBottom);

      usedAnchorElemDimsArr.push(refDim);

      if (takeHeight) {
        if (softAnchor && (height > maxHeight)) {
          // Y position with two fixpoints: the position of the anchor element and the height, but
          // it is not enough space, so move the top or bottom position over the anchor. Scrolling
          // in this direction is possible.

          res.cardStyle = {
            ...res.cardStyle,
            ...(upwards
              ? {
                top: numToPx(distTop),
                bottom: numToPx(Math.max(distBottom, (viewportHeight - height - distTop))),
              }
              : {
                top: numToPx(Math.max(distTop, (viewportHeight - height - distBottom))),
                bottom: numToPx(distBottom),
              }),
            height: 'initial',
          };
        } else {
          // Y position with two fixpoints: the position of the anchor element and the height, but
          // do not move the top or bottom position if the space is too small. Limit the height to
          // the maximum of the available height. Scrolling in this direction is possible.

          res.cardStyle = {
            ...res.cardStyle,
            ...(upwards
              ? { bottom: numToPx(viewportHeight - anchorElemRect[refDim]) }
              : { top: numToPx(anchorElemRect[refDim]) }
            ),
            height: numToPx(Math.min(maxHeight, height)),
          };

          // Here it may happen, that the card is placed outside of the viewport.
          if ((anchorElemRect[refDim] < 0) || (anchorElemRect[refDim] > viewportHeight)) {
            res.isPlacedOutside = true;
          }
        }

        isScrollingVPossible = true;
      } else {
        // Y position with one fixpoint: the position of the anchor element. The height will be set
        // automatically, limited to the maximum of the available height. Scrolling in this
        // direction is NOT possible.

        res.cardStyle = {
          ...res.cardStyle,
          ...(upwards
            ? { bottom: numToPx(viewportHeight - anchorElemRect[refDim]) }
            : { top: numToPx(anchorElemRect[refDim]) }
          ),
          maxHeight: numToPx(maxHeight),
          height: 'initial',
        };

        // Here it may happen, that the card is placed outside of the viewport.
        if ((anchorElemRect[refDim] < 0) || (anchorElemRect[refDim] > viewportHeight)) {
          res.isPlacedOutside = true;
        }
      }

    // ---------------------------------------------------------------------------------------------
    } else {
    // ---------------------------------------------------------------------------------------------

      // Y position without any fixpoints: take the given height or the complete height of the
      // viewport. Scrolling in this direction is possible.

      res.cardStyle = {
        ...res.cardStyle,
        top: numToPx(distTop),
        height: numToPx(takeHeight
          ? Math.min((viewportHeight - distV), height)
          : (viewportHeight - distV)),
      };
      isScrollingVPossible = true;
    }

    res.isScrollingPossible = isScrollingHPossible && isScrollingVPossible;
    res.usedAnchorElemDims = usedAnchorElemDimsArr.join(' ');

    return res;
  };


  const {
    cardStyle, isPlacedOutside, isScrollingPossible, usedAnchorElemDims,
  } = deriveCardPlacement();


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    clientLeft: cardElemRef.current?.clientLeft,
    clientWidth: cardElemRef.current?.clientWidth,
    clientTop: cardElemRef.current?.clientTop,
    clientHeight: cardElemRef.current?.clientHeight,
    getBoundingClientRect: () => cardElemRef.current?.getBoundingClientRect(),
    contains: (other: Node | null) => cardElemRef.current?.contains(other),
    ...scrollingHandleRef.current,
  }), []);


  /**
   * Handler for the native event "pointerdown" of the window element. Call prop onClickBeside, if
   * a) the target of the event is inside the root container, or
   * b) the target of the event is inside the temporary container (like this card) but below this
   *    card in the DOM hierarchy.
   *
   * It keeps its useCallback for the effect that registers it as a listener and lists it in its
   * dependencies: react-hooks/exhaustive-deps does not know the React Compiler and asks for a
   * stable identity there. The same holds for the two handlers below.
   */
  const handleWindowPointerDown = useCallback((event: PointerEvent) => {
    if (
      (event.target instanceof Node)
      && !cardElemRef.current?.contains(event.target)
      && !scrollingHandleRef.current?.contains(event.target)
    ) {
      if (document.getElementById(process.env['ELEM_ID_ROOT'] ?? '')?.contains(event.target)) {
        event.preventDefault(); // otherwise text selection works
        onClickBeside?.({ event });
      } else {
        const tempElems = document.getElementById(process.env['ELEM_ID_TEMP'] ?? '')?.children;

        if (tempElems) {
          for (const tempElem of tempElems) {
            if (tempElem.contains(event.target)) {
              event.preventDefault(); // otherwise text selection works
              onClickBeside?.({ event });
            } else {
              break;
            }
          }
        }
      }
    }
  }, [onClickBeside]);


  /**
   * Handler for the native event "keydown" of the window element to call prop "onPressEscape" if
   * the Escape key is pressed.
   */
  const handleWindowKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onPressEscape?.({ event });
    }
  }, [onPressEscape]);


  /**
   * Handler for the custom event "domChange" of the document element to call "onMoveAnchorElem"
   * either if the viewpoint dimensions change or if the given anchor element changes its absolute
   * position.
   */
  const handleDomChange = useCallback((event: Event | MutationRecord[] | undefined) => {
    const nextCardRect = (cardElemRef.current ?? scrollingHandleRef.current)?.getBoundingClientRect();
    const nextAnchorElemRect = anchorElemRef?.current?.getBoundingClientRect();

    setCardRect((prevValue) => ((
      !nextCardRect
      || (nextCardRect.width !== prevValue?.width)
      || (nextCardRect.height !== prevValue.height)
    )
      ? nextCardRect
      : prevValue
    ));

    setAnchorElemRect((prevValue) => ((
      !nextAnchorElemRect
      || (nextAnchorElemRect.left !== prevValue?.left)
      || (nextAnchorElemRect.right !== prevValue.right)
      || (nextAnchorElemRect.top !== prevValue.top)
      || (nextAnchorElemRect.bottom !== prevValue.bottom)
    )
      ? nextAnchorElemRect
      : prevValue
    ));

    // Prop "onMoveAnchorElem" is called if either one of the viewport dimensions width or height
    // have changed, or if the anchor element was and is given and if one of its dimensions used for
    // the calculations above have changed.
    if (
      (Math.abs(viewportWidth - prevsRef.current.viewportWidth) > domChangeTolerance)
      || (Math.abs(viewportHeight - prevsRef.current.viewportHeight) > domChangeTolerance)
      || (
        (nextAnchorElemRect && prevsRef.current.anchorElemRect)
        && (usedAnchorElemDims.split(' ') as ('left' | 'right' | 'top' | 'bottom')[]).some((dim) => (
          Math.abs(nextAnchorElemRect[dim] - prevsRef.current.anchorElemRect![dim]) > domChangeTolerance
        ))
      )
    ) {
      onMoveAnchorElem?.({ isPlacedOutside, event });
    }

    prevsRef.current.viewportWidth = viewportWidth;
    prevsRef.current.viewportHeight = viewportHeight;
    prevsRef.current.anchorElemRect = nextAnchorElemRect;
  }, [anchorElemRef, onMoveAnchorElem, viewportHeight, viewportWidth, isPlacedOutside, usedAnchorElemDims]);


  /**
   * Handler for the synthetic React event "onClick" of the native main element of the card to
   * propagate to prop "onClick".
   */
  const handleClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    onClick?.({ event });
  };


  /**
   * Handler for the synthetic React event "onPointerDown" of the native main element of the card to
   * propagate to prop "onPointerDown".
   */
  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    onPointerDown?.({ event });
  };


  /**
   * Handler for the synthetic React event "onPointerUp" of the native main element of the card to
   * propagate to prop "onPointerUp".
   */
  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    onPointerUp?.({ event });
  };


  /**
   * Handler for the synthetic React event "onKeyDown" of the native main element of the card to
   * propagate to prop "onKeyDown".
   */
  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    onKeyDown?.({ event });
  };


  /**
   * Handler for the synthetic React event "onWheel" to stop its propagation.
   */
  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useLayoutEffect(() => {
    if (anchorElemRef?.current) {
      setAnchorElemRect(anchorElemRef.current.getBoundingClientRect());
    }
  }, [anchorElemRef]);


  useLayoutEffect(() => {
    if (cardElemRef.current) {
      setCardRect(cardElemRef.current.getBoundingClientRect());
    } else if (scrollingHandleRef.current) {
      setCardRect(scrollingHandleRef.current.getBoundingClientRect());
    }
  }, []);


  useEffect(() => {
    if (typeof onClickBeside === 'function') {
      window.addEventListener('pointerdown', handleWindowPointerDown);

      return () => {
        window.removeEventListener('pointerdown', handleWindowPointerDown);
      };
    }
    return undefined;
  }, [onClickBeside, handleWindowPointerDown]);


  useEffect(() => {
    if (typeof onPressEscape === 'function') {
      window.addEventListener('keydown', handleWindowKeyDown);

      return () => {
        window.removeEventListener('keydown', handleWindowKeyDown);
      };
    }
    return undefined;
  }, [onPressEscape, handleWindowKeyDown]);


  useEffect(() => {
    document.addEventListener('domChange', handleDomChange);

    return () => {
      document.removeEventListener('domChange', handleDomChange);
    };
  }, [handleDomChange]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!portalCntr) {
    return null;
  }


  const cardClasses = classNames(css.card, {
    [css.clickable]: (typeof onClick === 'function') || (typeof onPointerUp === 'function'),
    [css.show]: (show !== false),
    // A card on a reference element ties itself to that element with the smaller shadow, and it
    // needs no prop to say so: the anchor is the statement. Every anchored card in the framework
    // set both together, so the pairing was a convention three call sites had to remember.
    [css.anchored]: !!anchorElemRef,
  });

  const content = (isScrollingPossible && (scrollBarV || scrollBarH))
    ? (
      <Scrolling
        ref={scrollingHandleRef}
        {...(id && { id })}
        className={cardClasses}
        style={cardStyle}
        vertical={scrollBarV}
        horizontal={scrollBarH}
      >
        <div
          className={css.innerCard}
          style={innerElemStyle}
          {...((typeof onClick === 'function') && { onClick: handleClick })}
          {...((typeof onPointerDown === 'function') && { onPointerDown: handlePointerDown })}
          {...((typeof onPointerUp === 'function') && { onPointerUp: handlePointerUp })}
          {...((typeof onKeyDown === 'function') && { onKeyDown: handleKeyDown })}
        >
          {children}
        </div>
      </Scrolling>
    )
    : (
      <div
        ref={cardElemRef}
        {...(id && { id })}
        className={cardClasses}
        style={cardStyle}
        {...((typeof onClick === 'function') && { onClick: handleClick })}
        {...((typeof onPointerDown === 'function') && { onPointerDown: handlePointerDown })}
        {...((typeof onPointerUp === 'function') && { onPointerUp: handlePointerUp })}
        {...((typeof onKeyDown === 'function') && { onKeyDown: handleKeyDown })}
        onWheel={handleWheel}
      >
        <div style={innerElemStyle} className={css.innerCard}>
          {children}
        </div>
      </div>
    );

  if (insertInPlace) {
    return content;
  }

  return createPortal(content, portalCntr);
};

Card.displayName = 'Card';


export { Card };
