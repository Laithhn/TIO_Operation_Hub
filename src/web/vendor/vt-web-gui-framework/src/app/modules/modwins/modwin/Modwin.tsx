import {
  useCallback, useEffect, useRef, useState,
} from 'react';

import { Content } from 'app/modules/content';
import { ErrorScreen } from 'app/modules/errorScreen';
import { layout } from 'assets/styles';
import { Resizer } from 'components/helpers/resizer';
import { useDispatch } from 'components/hooks/useDispatch';
import { useDrag } from 'components/hooks/useDrag';
import { useSelector } from 'components/hooks/useSelector';
import { useThrottledCallback } from 'components/hooks/useThrottledCallback';
import { classNames } from 'utils/classNames';

import {
  finishLoadingContent, minimize, moveToForeground, selectIsInTheForeground, selectModwin,
} from '../modwins.slice';

import { Header } from './header/Header';
import * as css from './modwin.scss';
import type { ModwinPosition, ModwinProps } from './modwin.types';


/**
 * React component of a modal window.
 */
const Modwin = ({ ref, id, onClose }: ModwinProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const {
    contentPath, contentData, title, width: initialWidth, height: initialHeight, isMinimized,
    isDraggable, isResizable, isMinimizable, isUnclosable, closeByEscape, isExclusive, dimmedBackground,
  } = useSelector((state) => selectModwin(state, id)!);
  const isInTheForeground = useSelector((state) => selectIsInTheForeground(state, id));


  const [position, setPosition] = useState<ModwinPosition>(() => {
    const { clientWidth, clientHeight } = document.documentElement;
    const maxWidth = clientWidth - (layout.modwins.spaceLeftRight * 2);
    const maxHeight = clientHeight - layout.modwins.spaceTop - layout.modwins.spaceBottom;
    const res: ModwinPosition = {
      left: 0, width: 0, top: 0, height: 0,
    };

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
      res.left = layout.modwins.spaceLeftRight;
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
      res.top = layout.modwins.spaceTop;
      res.height = maxHeight;
    }

    return res;
  });

  const wasDraggedRef = useRef(false);
  const wasResizedRef = useRef(false);
  const prevsRef = useRef({ initialWidth, initialHeight });


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  const deriveModwinStyle = () => (Object.keys(position) as (keyof ModwinPosition)[]).reduce<React.CSSProperties>((acc, key) => ({
    ...acc,
    [key]: `${position[key]}px`,
  }), {});


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const { dragProps: dragPropsForHeader } = useDrag({
    rangeX: [0, document.documentElement.clientWidth],
    rangeY: [0, document.documentElement.clientHeight],
    pointerDownPropagation: true,
    onDrag: ({ diffX, diffY }) => {
      wasDraggedRef.current = true;

      setPosition((prevPosition) => ({
        ...prevPosition,
        left: prevPosition.left + diffX,
        top: prevPosition.top + diffY,
      }));
    },
  });


  /**
   * Handler for the native event "resize" of the window element.
   */
  const handleWindowResize = useThrottledCallback(() => {
    setPosition((prevPosition) => {
      const { clientWidth, clientHeight } = document.documentElement;
      const maxWidth = clientWidth - (layout.modwins.spaceLeftRight * 2);
      const maxHeight = clientHeight - layout.modwins.spaceTop - layout.modwins.spaceBottom;
      const nextPosition: ModwinPosition = {
        left: 0, width: 0, top: 0, height: 0,
      };

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
        nextPosition.left = Math.min(prevPosition.left, (clientWidth - layout.modwins.spaceLeftRight));
        nextPosition.width = prevPosition.width;
      } else if ((initialWidth <= 0) || (initialWidth > maxWidth)) {
        // B
        nextPosition.left = layout.modwins.spaceLeftRight;
        nextPosition.width = maxWidth;
      } else {
        // C
        nextPosition.left = Math.round((clientWidth - initialWidth) / 2);
        nextPosition.width = initialWidth;
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
        nextPosition.top = Math.min(prevPosition.top, (clientHeight - layout.modwins.spaceBottom));
        nextPosition.height = prevPosition.height;
      } else if ((initialHeight <= 0) || (initialHeight > maxHeight)) {
        // B
        nextPosition.top = layout.modwins.spaceTop;
        nextPosition.height = maxHeight;
      } else {
        // C
        nextPosition.top = Math.round((clientHeight - initialHeight) / 2);
        nextPosition.height = initialHeight;
      }

      if (
        (nextPosition.left === prevPosition.left)
        && (nextPosition.width === prevPosition.width)
        && (nextPosition.top === prevPosition.top)
        && (nextPosition.height === prevPosition.height)
      ) {
        return prevPosition;
      }

      return nextPosition;
    });
  }, { delay: 60 });


  /**
   * Handler for the native event "keydown" of the window element.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const handleWindowKeyDown = useCallback((event: KeyboardEvent) => {
    if (isInTheForeground && (event.key === 'Escape')) {
      onClose(id);
    }
  }, [id, onClose, isInTheForeground]);


  /**
   *
   */
  const handleFinishLoading = () => {
    dispatch(finishLoadingContent(id));
  };


  /**
   *
   */
  const handleMinimize = () => {
    dispatch(minimize(id));
  };


  /**
   *
   */
  const handleClose = () => {
    onClose(id);
  };


  /**
   *
   */
  const handleMoveToForeground = () => {
    if (!isInTheForeground) {
      dispatch(moveToForeground(id));
    }
  };


  /**
   *
   */
  const handleResize: React.ComponentProps<typeof Resizer>['onSetPosition'] = (pos) => {
    wasResizedRef.current = true;
    setPosition(pos);
  };


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


  useEffect(() => {
    if (
      (initialWidth !== prevsRef.current.initialWidth)
      || (initialHeight !== prevsRef.current.initialHeight)
    ) {
      setPosition((prevPosition) => {
        const { clientWidth, clientHeight } = document.documentElement;
        const maxWidth = clientWidth - (layout.modwins.spaceLeftRight * 2);
        const maxHeight = clientHeight - layout.modwins.spaceTop - layout.modwins.spaceBottom;
        const nextPosition: ModwinPosition = {
          left: 0, width: 0, top: 0, height: 0,
        };

        // Set left position and width by the following matrix:
        // initialWidth      result
        // -----------------------------------------------
        // none              (B) horizontal full screen
        // yes, <= maxWidth  (A) change width, try to keep center position
        // yes, > maxWidth   (B) horizontal full screen
        if ((initialWidth > 0) && (initialWidth <= maxWidth)) {
          // A
          nextPosition.left = Math.max(
            layout.modwins.spaceLeftRight,
            prevPosition.left - Math.round((initialWidth - prevPosition.width) / 2),
          );
          nextPosition.width = initialWidth;
        } else {
          // B
          nextPosition.left = layout.modwins.spaceLeftRight;
          nextPosition.width = maxWidth;
        }

        // Set top position and height by the following matrix:
        // initialHeight      result
        // -------------------------------------------------
        // none               (B) vertical full screen
        // yes, <= maxHeight  (A) change height, try to keep top position
        // yes, > maxHeight   (B) vertical full screen
        if ((initialHeight > 0) && (initialHeight <= maxHeight)) {
          // A
          nextPosition.top = Math.min(
            prevPosition.top,
            clientHeight - initialHeight - layout.modwins.spaceBottom,
          );
          nextPosition.height = initialHeight;
        } else {
          // B
          nextPosition.top = layout.modwins.spaceTop;
          nextPosition.height = maxHeight;
        }

        if (
          (nextPosition.left === prevPosition.left)
          && (nextPosition.width === prevPosition.width)
          && (nextPosition.top === prevPosition.top)
          && (nextPosition.height === prevPosition.height)
        ) {
          return prevPosition;
        }

        return nextPosition;
      });
    }

    prevsRef.current.initialWidth = initialWidth;
    prevsRef.current.initialHeight = initialHeight;
  }, [initialWidth, initialHeight]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const modwinClasses = classNames(css.modwin, {
    [css.minimized]: isMinimized,
  });

  const exclusiveScreenClasses = classNames(css.exclusiveScreen, {
    [css.visible]: dimmedBackground,
  });

  return (
    <>
      {isExclusive && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <div className={exclusiveScreenClasses} />
      )}
      <div
        className={modwinClasses}
        style={deriveModwinStyle()}
        onPointerDown={handleMoveToForeground}
      >
        <Header
          title={title}
          {...(isDraggable && dragPropsForHeader)}
          {...(isMinimizable && { onMinimize: handleMinimize })}
          {...(!isUnclosable && { onClose: handleClose })}
        />
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
          )
          : (
            <ErrorScreen
              title="Error loading Content"
              subTitle="Sorry, an error occured while trying to load a content:"
              message="No content path is given for this modal window. Please check your configuration."
            />
          )}
        {isResizable && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
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
};

Modwin.displayName = 'Modwin';


export { Modwin };
