import PropTypes from 'prop-types';
import {
  memo, forwardRef, useState, useRef, useMemo, useCallback, useEffect,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';

import defines from 'assets/defines';
import Resizer from 'components/helpers/resizer';
import useDrag from 'components/hooks/useDrag';
import { useThrottledCallback } from 'components/hooks/useThrottle';
import Content from 'frame/content';
import ErrorScreen from 'frame/errorScreen';
import { actions, selectors } from 'store';
import classNames from 'utils/classNames';

import Header from './header';
import css from './modwin.scss';


/**
 * React component of a modal window.
 */
const Modwin = memo(forwardRef(({ id, onClose }, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const {
    contentPath, contentData, title, width: initialWidth, height: initialHeight, minimized,
    draggable, resizable, minimizable, unclosable, closeByEscape, exclusive, dimmedBackground,
  } = useSelector((state) => selectors.modwins.getModwinById(state, id));
  const isInTheForeground = useSelector((state) => selectors.modwins.isInTheForeground(state, id));


  const [position, setPosition] = useState(() => {
    const { clientWidth, clientHeight } = document.documentElement;
    const maxWidth = clientWidth - (defines.layout.modwins.spaceLeftRight * 2);
    const maxHeight = clientHeight - defines.layout.modwins.spaceTop - defines.layout.modwins.spaceBottom;
    const res = {};

    // Set left position and width by the following matrix:
    // initialWidth      result
    // -----------------------------------------------
    // none              (B) horizontal full screen
    // yes, <= maxWidth  (A) center with initial width
    // yes, > maxWidth   (B) horizontal full screen
    if ((initialWidth > 0) && (initialWidth <= maxWidth)) {
      // A
      res.left = Math.round((clientWidth - initialWidth) / 2);
      res.width = initialWidth;
    } else {
      // B
      res.left = defines.layout.modwins.spaceLeftRight;
      res.width = maxWidth;
    }

    // Set top position and height by the following matrix:
    // initialHeight      result
    // -------------------------------------------------
    // none               (B) vertical full screen
    // yes, <= maxHeight  (A) center with initial height
    // yes, > maxHeight   (B) vertical full screen
    if ((initialHeight > 0) && (initialHeight <= maxHeight)) {
      // A
      res.top = Math.round((clientHeight - initialHeight) / 2);
      res.height = initialHeight;
    } else {
      // B
      res.top = defines.layout.modwins.spaceTop;
      res.height = maxHeight;
    }

    return res;
  });

  const wasDraggedRef = useRef(false);
  const wasResizedRef = useRef(false);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const modwinStyle = useMemo(() => Object.keys(position).reduce((acc, key) => ({
    ...acc,
    [key]: `${position[key]}px`,
  }), {}), [position]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const { dragProps: dragPropsForHeader } = useDrag({
    rangeX: [0, document.documentElement.clientWidth],
    rangeY: [0, document.documentElement.clientHeight],
    pointerDownPropagation: true,
    onDrag: useCallback((pointerPosX, pointerPosY, pointerDiffX, pointerDiffY) => {
      wasDraggedRef.current = true;

      setPosition((prevPosition) => ({
        ...prevPosition,
        left: prevPosition.left + pointerDiffX,
        top: prevPosition.top + pointerDiffY,
      }));
    }, []),
  });


  /**
   *
   */
  const handleWindowResize = useThrottledCallback(useCallback(() => {
    setPosition((prevValue) => {
      const { clientWidth, clientHeight } = document.documentElement;
      const maxWidth = clientWidth - (defines.layout.modwins.spaceLeftRight * 2);
      const maxHeight = clientHeight - defines.layout.modwins.spaceTop - defines.layout.modwins.spaceBottom;
      let nextLeft, nextWidth, nextTop, nextHeight;

      // Set left position and width by the following matrix (note that if the modal window is
      // resizable, it is automatically also draggable):
      // initialWidth      was resized or dragged      result left                  result width
      // -------------------------------------------------------------------------------------------
      // none              no                      (B) set to the left              set viewport width
      // none              yes                     (A) adjust left to stay visible  keep width
      // yes, <= maxWidth  no                      (C) set to the center            set initial width
      // yes, <= maxWidth  yes                     (A) adjust left to stay visible  keep width
      // yes, > maxWidth   no                      (B) set to the left              set viewport width
      // yes, > maxWidth   yes                     (A) adjust left to stay visible  keep width
      if (wasResizedRef.current || wasDraggedRef.current) {
        // A
        nextLeft = Math.min(prevValue.left, (clientWidth - defines.layout.modwins.spaceLeftRight));
        nextWidth = prevValue.width;
      } else if ((initialWidth <= 0) || (initialWidth > maxWidth)) {
        // B
        nextLeft = defines.layout.modwins.spaceLeftRight;
        nextWidth = maxWidth;
      } else {
        // C
        nextLeft = Math.round((clientWidth - initialWidth) / 2);
        nextWidth = initialWidth;
      }

      // Set top position and height by the following matrix (note that if the modal window is
      // resizable, it is automatically also draggable):
      // initialHeight      was resized or dragged      result top                  result height
      // -------------------------------------------------------------------------------------------
      // none               no                      (B) set to the top              set viewport height
      // none               yes                     (A) adjust top to stay visible  keep height
      // yes, <= maxHeight  no                      (C) set to the center           set initial height
      // yes, <= maxHeight  yes                     (A) adjust top to stay visible  keep height
      // yes, > maxHeight   no                      (B) set to the top              set viewport height
      // yes, > maxHeight   yes                     (A) adjust top to stay visible  keep height
      if (wasResizedRef.current || wasDraggedRef.current) {
        // A
        nextTop = Math.min(prevValue.top, (clientHeight - defines.layout.modwins.spaceBottom));
        nextHeight = prevValue.height;
      } else if ((initialHeight <= 0) || (initialHeight > maxHeight)) {
        // B
        nextTop = defines.layout.modwins.spaceTop;
        nextHeight = maxHeight;
      } else {
        // C
        nextTop = Math.round((clientHeight - initialHeight) / 2);
        nextHeight = initialHeight;
      }

      if (
        (nextLeft === prevValue.left)
        && (nextWidth === prevValue.width)
        && (nextTop === prevValue.top)
        && (nextHeight === prevValue.height)
      ) {
        return prevValue;
      }

      return {
        left: nextLeft,
        width: nextWidth,
        top: nextTop,
        height: nextHeight,
      };
    });
  }, [initialWidth, initialHeight]), { delay: 60 });


  /**
   * Memoized handler for native event "keydown" on the window element.
   */
  const handleWindowKeyDown = useCallback((event) => {
    if (isInTheForeground && (event.key === 'Escape')) {
      onClose(id);
    }
  }, [id, onClose, isInTheForeground]);


  /**
   *
   */
  const handleFinishLoading = useCallback(() => {
    dispatch(actions.modwins.finishLoadingContent(id));
  }, [id, dispatch]);


  /**
   *
   */
  const handleMinimize = useCallback(() => {
    dispatch(actions.modwins.minimize(id));
  }, [id, dispatch]);


  /**
   *
   */
  const handleClose = useCallback(() => {
    onClose(id);
  }, [id, onClose]);


  /**
   *
   */
  const handleMoveToForeground = () => {
    if (!isInTheForeground) {
      dispatch(actions.modwins.moveToForeground(id));
    }
  };


  /**
   *
   */
  const handleResize = useCallback((pos) => {
    wasResizedRef.current = true;
    setPosition(pos);
  }, []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [handleWindowResize]);


  useEffect(() => {
    if (closeByEscape) {
      window.addEventListener('keydown', handleWindowKeyDown);

      return () => {
        window.removeEventListener('keydown', handleWindowKeyDown);
      };
    }

    return undefined;
  }, [closeByEscape, handleWindowKeyDown]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const modwinClasses = classNames(css.modwin, {
    [css.minimized]: minimized,
  });

  const exclusiveScreenClasses = classNames(css.exclusiveScreen, {
    [css.visible]: dimmedBackground,
  });

  return (
    <>
      {exclusive && <div className={exclusiveScreenClasses} />}
      <div
        className={modwinClasses}
        style={modwinStyle}
        onPointerDown={handleMoveToForeground}
      >
        <Header
          title={title}
          {...(draggable && dragPropsForHeader)}
          {...(minimizable && { onMinimize: handleMinimize })}
          {...(!unclosable && { onClose: handleClose })}
        />
        <div className={css.contentContr}>
          {contentPath
            ? (
              <Content
                ref={ref}
                contentPath={contentPath}
                isScopeModwin
                callerId={id}
                contentData={contentData}
                onFinishLoading={handleFinishLoading}
              />
            ) : (
              <ErrorScreen
                title="Error loading Content"
                subTitle="Sorry, an error occured while trying to load a content:"
                message={`No menu node with content path was found by URL ${contentPath}. Please check your menu configuration.`}
              />
            )}
        </div>
        {resizable && (
          <Resizer
            enableResizeLeft
            enableResizeRight
            enableResizeTop
            enableResizeBottom
            position={position}
            onSetPosition={handleResize}
          />
        )}
      </div>
    </>
  );
  //                                                                                  </editor-fold>
}));

Modwin.displayName = 'Modwin';

Modwin.propTypes = {
  id: PropTypes.string.isRequired,
  onClose: PropTypes.func,
};

Modwin.defaultProps = {
  onClose() {},
};

export default Modwin;
