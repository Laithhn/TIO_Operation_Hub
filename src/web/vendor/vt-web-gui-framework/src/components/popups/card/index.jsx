import PropTypes from 'prop-types';
import {
  useState, useRef, useMemo, useCallback, useEffect,
} from 'react';
import { createPortal } from 'react-dom';

import Scrolling from 'components/helpers/scrolling';
import useStylingProps from 'components/hooks/useStylingProps';
import classNames from 'utils/classNames';
import getViewportDims from 'utils/getViewportDims';

import css from './card.scss';
import stylingProps from './stylingProps';


const domChangeTolerance = 5;


/**
 * Helper function to return the current dimensions of the viewport, the position of a given anchor
 * element and the dimensions of the card itself. All values are in pixels without decimal places.
 * If no valid elements are given, only the viewport dimensions are returned. Note that "right" is
 * the position of the right side of the element, measured from the left side of the viewport. The
 * same applies for "bottom".
 *
 * @param {object} [anchorElem] - Optionally the React-reference of an element or the anchor element.
 * @param {object} [cardElem] - Optionally the React-reference of an element or the card itself.
 * @returns {{ viewportWidth: number, viewportHeight: number, left?: number, right?: number, top?: number, bottom?: number }}
 */
const getReferenceDims = (anchorElem, cardElem) => {
  const { width: viewportWidth, height: viewportHeight } = getViewportDims();
  const anchorDims = anchorElem && anchorElem.getBoundingClientRect();
  const cardDims = cardElem && cardElem.getBoundingClientRect();

  return {
    viewportWidth,
    viewportHeight,
    ...(anchorDims && {
      left: Math.round(anchorDims.left),
      right: Math.round(anchorDims.right),
      top: Math.round(anchorDims.top),
      bottom: Math.round(anchorDims.bottom),
    }),
    ...(cardDims && {
      cardWidth: Math.round(cardDims.width),
      cardHeight: Math.round(cardDims.height),
    }),
  };
};


/**
 *
 */
const numToPx = (value) => ((value === 0) ? 0 : `${value}px`);


/**
 * React component of a universal card.
 */
const Card = ({
  id, show, left, right, width, top, bottom, height, insertInPlace, anchorElemRef,
  placeBesideAnchorElem, softAnchor, smallShadow, scrollBarV, scrollBarH, onClick, onPointerDown,
  onPointerUp, onKeyDown, onClickBeside, onPressEscape, onMoveAnchorElem, children, ...restProps
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const anchorElem = anchorElemRef?.current ?? anchorElemRef ?? null;

  const [referenceDims, setReferenceDims] = useState(getReferenceDims(anchorElem));

  const cardRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle, innerElemStyle } = useStylingProps(restProps, stylingProps);

  const {
    cardStyle, isPlacedOutside, isScrollingPossible, usedRefDims,
  } = useMemo(() => {
    // Priority rules: if prop "left" is set to "center", then prop "right" is ignored. Prop "width"
    // has priority over "right", if "left" is set too.
    const typeOfLeft = typeof left;
    const isLeftNumber = (typeOfLeft === 'number');
    const centerH = ((typeOfLeft === 'string') && (left.toLowerCase() === 'center'));
    const takeLeft = isLeftNumber && (left >= 0);
    const takeWidth = (width !== null) && (width >= 0);
    const takeRight = !centerH && !(takeLeft && takeWidth) && (right !== null) && (right >= 0);
    // Priority rules: if prop "top" is set to "center", then prop "bottom" is ignored. Prop
    // "height" has priority over "bottom", if "top" is set too.
    const typeOfTop = typeof top;
    const isTopNumber = (typeOfTop === 'number');
    const centerV = ((typeOfTop === 'string') && (top.toLowerCase() === 'center'));
    const takeTop = isTopNumber && (top >= 0);
    const takeHeight = (height !== null) && (height >= 0);
    const takeBottom = !centerV && !(takeTop && takeHeight) && (bottom !== null) && (bottom >= 0);

    // the distances to the left and right viewport borders
    const distLeft = (isLeftNumber && (left < 0)) ? -left : 0;
    const distRight = (isLeftNumber && (right < 0)) ? -right : 0;
    // since one of the two positions is set, only the other can be used as distance (> 0)
    const distH = distLeft + distRight;

    // the distances to the top and bottom viewport borders
    const distTop = (isTopNumber && (top < 0)) ? -top : 0;
    const distBottom = (isTopNumber && (bottom < 0)) ? -bottom : 0;
    // since one of the two positions is set, only the other can be used as distance (> 0)
    const distV = distTop + distBottom;

    const res = {
      cardStyle: outerElemStyle,
      isPlacedOutside: false,
      isScrollingPossible: false,
      usedRefDims: null,
    };
    let isScrollingHPossible = false,
      isScrollingVPossible = false;

    // ---------------------------------------------------------------------------------------------
    if (centerH) {
    // ---------------------------------------------------------------------------------------------

      // X position: center in the middle of the viewport

      res.cardStyle = {
        ...res.cardStyle,
        left: (referenceDims.viewportWidth - (referenceDims.cardWidth ?? 0)) / 2,
        ...(takeWidth && { width: Math.min(referenceDims.viewportWidth, width) }),
        ...(!referenceDims.cardWidth && { visibility: 'hidden' }),
      };
      res.usedRefDims = ['cardWidth'];
      isScrollingHPossible = takeWidth;

    // ---------------------------------------------------------------------------------------------
    } else if (takeLeft && takeRight) {
    // ---------------------------------------------------------------------------------------------

      // X position: two fixpoints: left and right. Scrolling in this direction is possible.

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

      const maxWidth = referenceDims.viewportWidth - (takeLeft ? left : right) - distH;

      if (takeWidth) {
        if (softAnchor && (width > maxWidth)) {
          // X position: two fixpoints: left/right and width, but not enough space, so move the
          // left/right position. Scrolling in this direction is possible.

          const movedPos = Math.max(0, (referenceDims.viewportWidth - width - distH));

          res.cardStyle = {
            ...res.cardStyle,
            ...(takeLeft ? {
              left: numToPx(movedPos),
              right: numToPx(distH),
            } : {
              left: numToPx(distH),
              right: numToPx(movedPos),
            }),
            width: 'initial',
          };
        } else {
          // X position: two fixpoints: left/right and width, but do not move the left/right
          // position if the space is too small. Limit the width to the maximum of the available
          // width. Scrolling in this direction is possible.

          res.cardStyle = {
            ...res.cardStyle,
            ...(takeLeft ? { left: numToPx(left) } : { right: numToPx(right) }),
            width: numToPx(Math.min(maxWidth, width)),
          };
        }

        isScrollingHPossible = true;
      } else {
        // X position: one fixpoint: left or right. The width will be set automatically, limited to
        // the maximum of the available width. Scrolling in this direction is NOT possible.

        res.cardStyle = {
          ...res.cardStyle,
          ...(takeLeft ? { left: numToPx(left) } : { right: numToPx(right) }),
          maxWidth: numToPx(maxWidth),
          width: 'initial',
        };
      }

    // ---------------------------------------------------------------------------------------------
    } else if (anchorElem) {
    // ---------------------------------------------------------------------------------------------

      const rightwards = ((referenceDims.viewportWidth - referenceDims.right - distRight) > (referenceDims.left - distLeft));
      const refDim = (rightwards ^ placeBesideAnchorElem) ? 'left' : 'right';
      const maxWidth = rightwards
        ? (referenceDims.viewportWidth - referenceDims[refDim] - distRight)
        : (referenceDims[refDim] - distLeft);

      res.usedRefDims = [refDim];

      if (takeWidth) {
        if (softAnchor && (width > maxWidth)) {
          // X position: two fixpoints: the position of the anchor element and width, but not
          // enough space, so move the left/right position over the anchor. Scrolling in this
          // direction is possible.

          res.cardStyle = {
            ...res.cardStyle,
            ...(rightwards ? {
              left: numToPx(Math.max(distLeft, (referenceDims.viewportWidth - width - distRight))),
              right: numToPx(distRight),
            } : {
              left: numToPx(distLeft),
              right: numToPx(Math.max(distRight, (referenceDims.viewportWidth - width - distLeft))),
            }),
            width: 'initial',
          };
        } else {
          // X position: two fixpoints: the position of the anchor element and width, but do not
          // move the left/right position if the space is too small. Limit the width to the
          // maximum of the available width. Scrolling in this direction is possible.

          res.cardStyle = {
            ...res.cardStyle,
            ...(rightwards
              ? { left: numToPx(referenceDims[refDim]) }
              : { right: numToPx(referenceDims.viewportWidth - referenceDims[refDim]) }
            ),
            width: numToPx(Math.min(maxWidth, width)),
          };

          // here it may happen, that the card is placed outside of the viewport
          res.isPlacedOutside = (referenceDims[refDim] < 0) || (referenceDims[refDim] > referenceDims.viewportWidth);
        }

        isScrollingHPossible = true;
      } else {
        // X position: one fixpoint: the position of the anchor element. The width will be set
        // automatically, limited to the maximum of the available width. Scrolling in this
        // direction is NOT possible.

        res.cardStyle = {
          ...res.cardStyle,
          ...(rightwards
            ? { left: numToPx(referenceDims[refDim]) }
            : { right: numToPx(referenceDims.viewportWidth - referenceDims[refDim]) }
          ),
          maxWidth: numToPx(maxWidth),
          width: 'initial',
        };

        // here it may happen, that the card is placed outside of the viewport
        res.isPlacedOutside = (referenceDims[refDim] < 0) || (referenceDims[refDim] > referenceDims.viewportWidth);
      }

    // ---------------------------------------------------------------------------------------------
    } else {
    // ---------------------------------------------------------------------------------------------

      // X position: no fixpoints, take the given width or the complete width of the viewport.
      // Scrolling in this direction is possible.

      res.cardStyle = {
        ...res.cardStyle,
        left: numToPx(distLeft),
        width: numToPx(takeWidth
          ? Math.min((referenceDims.viewportWidth - distH), width)
          : (referenceDims.viewportWidth - distH)),
      };
      isScrollingHPossible = true;
    }


    // ---------------------------------------------------------------------------------------------
    if (centerV) {
    // ---------------------------------------------------------------------------------------------

      //
      res.cardStyle = {
        ...res.cardStyle,
        top: (referenceDims.viewportHeight - (referenceDims.cardHeight ?? 0)) / 2,
        ...(takeHeight && { height: Math.min(referenceDims.viewportHeight, height) }),
        ...(!referenceDims.cardHeight && { visibility: 'hidden' }),
      };

      if (Array.isArray(res.usedRefDims)) {
        res.usedRefDims.push('cardHeight');
      } else {
        res.usedRefDims = ['cardHeight'];
      }

      isScrollingVPossible = takeHeight;

    // ---------------------------------------------------------------------------------------------
    } else if (takeTop && takeBottom) {
    // ---------------------------------------------------------------------------------------------

      // Y position: two fixpoints: top and bottom. Scrolling in this direction is possible.

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

      const maxHeight = referenceDims.viewportHeight - (takeTop ? top : bottom) - distV;

      if (takeHeight) {
        if (softAnchor && (height > maxHeight)) {
          // Y position: two fixpoints: top/bottom and height, but not enough space, so move the
          // top/bottom position. Scrolling in this direction is possible.

          const movedPos = Math.max(0, (referenceDims.viewportHeight - height - distV));

          res.cardStyle = {
            ...res.cardStyle,
            ...(takeTop ? {
              top: numToPx(movedPos),
              bottom: numToPx(distV),
            } : {
              top: numToPx(distV),
              bottom: numToPx(movedPos),
            }),
            height: 'initial',
          };
        } else {
          // Y position: two fixpoints: top/bottom and height, but do not move the top/bottom
          // position if the space is too small. Limit the height to the maximum of the available
          // height. Scrolling in this direction is possible.

          res.cardStyle = {
            ...res.cardStyle,
            ...(takeTop ? { top: numToPx(top) } : { bottom: numToPx(bottom) }),
            height: numToPx(Math.min(maxHeight, height)),
          };
        }

        isScrollingVPossible = true;
      } else {
        // Y position: one fixpoint: top or bottom. The height will be set automatically, limited to
        // the maximum of the available height. Scrolling in this direction is NOT possible.

        res.cardStyle = {
          ...res.cardStyle,
          ...(takeTop ? { top: numToPx(top) } : { bottom: numToPx(bottom) }),
          maxHeight: numToPx(maxHeight),
          height: 'initial',
        };
      }

    // ---------------------------------------------------------------------------------------------
    } else if (anchorElem) {
    // ---------------------------------------------------------------------------------------------

      const upwards = ((referenceDims.top - distTop) > (referenceDims.viewportHeight - referenceDims.bottom - distBottom));
      const refDim = (upwards ^ placeBesideAnchorElem) ? 'top' : 'bottom';
      const maxHeight = upwards
        ? (referenceDims[refDim] - distTop)
        : (referenceDims.viewportHeight - referenceDims[refDim] - distBottom);

      if (Array.isArray(res.usedRefDims)) {
        res.usedRefDims.push(refDim);
      } else {
        res.usedRefDims = [refDim];
      }

      if (takeHeight) {
        if (softAnchor && (height > maxHeight)) {
          // Y position: two fixpoints: the position of the anchor element and height, but not
          // enough space, so move the top/bottom position over the anchor. Scrolling in this
          // direction is possible.

          res.cardStyle = {
            ...res.cardStyle,
            ...(upwards ? {
              top: numToPx(distTop),
              bottom: numToPx(Math.max(distBottom, (referenceDims.viewportHeight - height - distTop))),
            } : {
              top: numToPx(Math.max(distTop, (referenceDims.viewportHeight - height - distBottom))),
              bottom: numToPx(distBottom),
            }),
            height: 'initial',
          };
        } else {
          // Y position: two fixpoints: the position of the anchor element and height, but do not
          // move the top/bottom position if the space is too small. Limit the height to the maximum
          // of the available height. Scrolling in this direction is possible.

          res.cardStyle = {
            ...res.cardStyle,
            ...(upwards
              ? { bottom: numToPx(referenceDims.viewportHeight - referenceDims[refDim]) }
              : { top: numToPx(referenceDims[refDim]) }
            ),
            height: numToPx(Math.min(maxHeight, height)),
          };

          // here it may happen, that the card is placed outside of the viewport
          res.isPlacedOutside = (
            res.isPlacedOutside
            || (referenceDims[refDim] < 0)
            || (referenceDims[refDim] > referenceDims.viewportHeight)
          );
        }

        isScrollingVPossible = true;
      } else {
        // Y position: one fixpoint: the position of the anchor element. The height will be set
        // automatically, limited to the maximum of the available height. Scrolling in this
        // direction is NOT possible.

        res.cardStyle = {
          ...res.cardStyle,
          ...(upwards
            ? { bottom: numToPx(referenceDims.viewportHeight - referenceDims[refDim]) }
            : { top: numToPx(referenceDims[refDim]) }
          ),
          maxHeight: numToPx(maxHeight),
          height: 'initial',
        };

        // here it may happen, that the card is placed outside of the viewport
        res.isPlacedOutside = (
          res.isPlacedOutside
          || (referenceDims[refDim] < 0)
          || (referenceDims[refDim] > referenceDims.viewportHeight)
        );
      }

    // ---------------------------------------------------------------------------------------------
    } else {
    // ---------------------------------------------------------------------------------------------

      // Y position: no fixpoints, take the given height or the complete height of the viewport.
      // Scrolling in this direction is possible.

      res.cardStyle = {
        ...res.cardStyle,
        top: numToPx(distTop),
        height: numToPx(takeHeight
          ? Math.min((referenceDims.viewportHeight - distV), height)
          : (referenceDims.viewportHeight - distV)),
      };
      isScrollingVPossible = true;
    }

    res.isScrollingPossible = isScrollingHPossible && isScrollingVPossible;

    return res;
  }, [left, right, width, top, bottom, height, placeBesideAnchorElem, softAnchor, anchorElem, referenceDims, outerElemStyle]);

  const isScrollBar = isScrollingPossible && (scrollBarV || scrollBarH);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Memoized handler for native event "pointerdown" on the window element. Call prop onClickBeside,
   * if
   * a) the target of the event is inside the root container, or
   * b) the target of the event is inside the temporary container (like this card) but below this
   *    card in the DOM hierarchy.
   */
  const handleWindowPointerDown = useCallback((event) => {
    if (!cardRef.current.contains(event.target)) {
      if (document.getElementById(process.env.ELEM_ID_ROOT).contains(event.target)) {
        event.preventDefault(); // otherwise text selection works
        onClickBeside(id, event);
      } else {
        const tempChildren = document.getElementById(process.env.ELEM_ID_TEMP).children;

        for (let i = 0; i < tempChildren.length; i++) {
          if (tempChildren[i].contains(event.target)) {
            event.preventDefault(); // otherwise text selection works
            onClickBeside(id, event);
            break;
          } else if (tempChildren[i].contains(cardRef.current)) {
            break;
          }
        }
      }
    }
  }, [id, onClickBeside]);


  /**
   * Memoized handler for event "key down" on the window element to call prop onPressEscape if the
   * Escape key is pressed.
   */
  const handleWindowKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      onPressEscape(id, event);
    }
  }, [id, onPressEscape]);


  /**
   * Memoized handler for custom event "domChange" on the document to call onMoveAnchorElem either
   * if the viewpoint dimensions change or if the given anchor element changes its absolute position.
   */
  const handleDomChange = useCallback((event) => {
    const dims = getReferenceDims(anchorElem, cardRef.current);

    if (
      (Math.abs(dims.viewportWidth - referenceDims.viewportWidth) > domChangeTolerance)
      || (Math.abs(dims.viewportHeight - referenceDims.viewportHeight) > domChangeTolerance)
      || (usedRefDims || []).some((pos) => (
        (dims[pos] === undefined)
        || (referenceDims[pos] === undefined)
        || (Math.abs(dims[pos] - referenceDims[pos]) > domChangeTolerance)
      ))
    ) {
      setReferenceDims(dims);

      if (typeof onMoveAnchorElem === 'function') {
        onMoveAnchorElem(id, event, isPlacedOutside);
      }
    }
  }, [id, onMoveAnchorElem, anchorElem, referenceDims, isPlacedOutside, usedRefDims]);


  /**
   * Handler for synthetic React event "onClick" on the native main element of the card to propagate
   * to prop onClick.
   */
  const handleClick = (event) => {
    onClick(id, event);
  };


  /**
   * Handler for synthetic React event "onPointerDown" on the native main element of the card to
   * propagate to prop onPointerDown.
   */
  const handlePointerDown = (event) => {
    onPointerDown(id, event);
  };


  /**
   * Handler for synthetic React event "onPointerUp" on the native main element of the card to
   * propagate to prop onPointerUp.
   */
  const handlePointerUp = (event) => {
    onPointerUp(id, event);
  };


  /**
   *
   */
  const handleKeyDown = (event) => {
    onKeyDown(id, event);
  };


  /**
   *
   */
  const handleWheel = (event) => {
    event.stopPropagation();
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

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

  const cardClasses = classNames(css.card, {
    [css.clickable]: (typeof onClick === 'function') || (typeof onPointerUp === 'function'),
    [css.show]: (show !== false),
    [css.smallShadow]: smallShadow,
  });

  const content = isScrollBar ? (
    <Scrolling
      ref={cardRef}
      className={cardClasses}
      style={cardStyle}
      vertical={scrollBarV}
      horizontal={scrollBarH}
    >
      <div
        style={innerElemStyle}
        className={css.innerCard}
        {...((typeof onClick === 'function') && { onClick: handleClick })}
        {...((typeof onPointerDown === 'function') && { onPointerDown: handlePointerDown })}
        {...((typeof onPointerUp === 'function') && { onPointerUp: handlePointerUp })}
        {...((typeof onKeyDown === 'function') && { onKeyDown: handleKeyDown })}
      >
        {children}
      </div>
    </Scrolling>
  ) : (
    <div
      ref={cardRef}
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

  return createPortal(content, document.getElementById(process.env.ELEM_ID_TEMP));
};

Card.displayName = 'Card';

Card.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  show: PropTypes.bool,
  left: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  right: PropTypes.number,
  width: PropTypes.number,
  top: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  bottom: PropTypes.number,
  height: PropTypes.number,
  insertInPlace: PropTypes.bool,
  anchorElemRef: PropTypes.object,
  placeBesideAnchorElem: PropTypes.bool,
  softAnchor: PropTypes.bool,
  smallShadow: PropTypes.bool,
  scrollBarV: PropTypes.bool,
  scrollBarH: PropTypes.bool,
  onClick: PropTypes.func,
  onPointerDown: PropTypes.func,
  onPointerUp: PropTypes.func,
  onKeyDown: PropTypes.func,
  onClickBeside: PropTypes.func,
  onPressEscape: PropTypes.func,
  onMoveAnchorElem: PropTypes.func,
  children: PropTypes.node,
};

Card.defaultProps = {
  id: '',
  show: null,
  left: null,
  right: null,
  width: null,
  top: null,
  bottom: null,
  height: null,
  insertInPlace: false,
  anchorElemRef: null,
  placeBesideAnchorElem: false,
  softAnchor: false,
  smallShadow: false,
  scrollBarV: false,
  scrollBarH: false,
  onClick: null,
  onPointerDown: null,
  onPointerUp: null,
  onKeyDown: null,
  onClickBeside: null,
  onPressEscape: null,
  onMoveAnchorElem: null,
  children: null,
};

export default Card;
