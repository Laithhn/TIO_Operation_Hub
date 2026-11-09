import { useCallback, useEffect, useState } from 'react';

import { layout } from 'assets/styles';
import { ResizeHandle, type ResizeHandleProps } from 'components/helpers/resizeHandle';
import { useDrag } from 'components/hooks/useDrag';

import type { ResizerProps } from './resizer.types';


// A device with a coarse pointer, a touch screen above all, gets every enabled handle all the time.
// A mouse brings a handle up by moving near an edge, but a touch moves no pointer before it presses,
// so nothing could bring the handle up in time.
const hasCoarsePointer = window.matchMedia('(any-pointer: coarse)').matches;


/**
 * React component of the helper component "Resizer" to add handles at the sides and corners of
 * absolute positioned containers to resize them with the mouse or by touch.
 */
const Resizer = ({
  enableResizeLeft = false, enableResizeRight = false, enableResizeTop = false,
  enableResizeBottom = false, position, onSetPosition,
}: ResizerProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [showResizeHandle, setShowResizeHandle] = useState<ResizeHandleProps['placement'] | null>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // The handles a coarse pointer gets, the sides before the corners: a handle drawn later lies on
  // top, and a corner overlaps two sides.
  const coarsePlacements = [
    enableResizeTop && 'top',
    enableResizeRight && 'right',
    enableResizeBottom && 'bottom',
    enableResizeLeft && 'left',
    enableResizeLeft && enableResizeTop && 'lefttop',
    enableResizeRight && enableResizeTop && 'righttop',
    enableResizeRight && enableResizeBottom && 'rightbottom',
    enableResizeLeft && enableResizeBottom && 'leftbottom',
  ].filter((placement): placement is ResizeHandleProps['placement'] => (typeof placement === 'string'));


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const { dragProps: { onPointerDown: handlePointerDown } } = useDrag<HTMLDivElement>({
    rangeX: [0, document.documentElement.clientWidth],
    rangeY: [0, document.documentElement.clientHeight],
    onDrag: ({ diffX, diffY }) => {
      switch (showResizeHandle) {
        case 'lefttop':
          onSetPosition((prevPosition) => ({
            ...prevPosition,
            left: prevPosition.left + diffX,
            width: prevPosition.width - diffX,
            top: prevPosition.top + diffY,
            height: prevPosition.height - diffY,
          }));
          break;

        case 'top':
          onSetPosition((prevPosition) => ({
            ...prevPosition,
            top: prevPosition.top + diffY,
            height: prevPosition.height - diffY,
          }));
          break;

        case 'righttop':
          onSetPosition((prevPosition) => ({
            ...prevPosition,
            width: prevPosition.width + diffX,
            top: prevPosition.top + diffY,
            height: prevPosition.height - diffY,
          }));
          break;

        case 'right':
          onSetPosition((prevPosition) => ({
            ...prevPosition,
            width: prevPosition.width + diffX,
          }));
          break;

        case 'rightbottom':
          onSetPosition((prevPosition) => ({
            ...prevPosition,
            width: prevPosition.width + diffX,
            height: prevPosition.height + diffY,
          }));
          break;

        case 'bottom':
          onSetPosition((prevPosition) => ({
            ...prevPosition,
            height: prevPosition.height + diffY,
          }));
          break;

        case 'leftbottom':
          onSetPosition((prevPosition) => ({
            ...prevPosition,
            left: prevPosition.left + diffX,
            width: prevPosition.width - diffX,
            height: prevPosition.height + diffY,
          }));
          break;

        case 'left':
          onSetPosition((prevPosition) => ({
            ...prevPosition,
            left: prevPosition.left + diffX,
            width: prevPosition.width - diffX,
          }));
          break;

        // no default
      }
    },
  });


  /**
   * Handler for the native event "mousemove" of the window element.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const handleWindowMouseMove = useCallback((event: MouseEvent) => {
    const resizeLeft = enableResizeLeft && (event.clientX - position.left) < layout.resizableSnapDim;
    const resizeRight = enableResizeRight && (position.left + position.width - event.clientX) < layout.resizableSnapDim;
    const resizeTop = enableResizeTop && (event.clientY - position.top) < layout.resizableSnapDim;
    const resizeBottom = enableResizeBottom && (position.top + position.height - event.clientY) < layout.resizableSnapDim;

    if (resizeLeft) {
      if (resizeTop) {
        setShowResizeHandle('lefttop');
      } else if (resizeBottom) {
        setShowResizeHandle('leftbottom');
      } else {
        setShowResizeHandle('left');
      }
    } else if (resizeRight) {
      if (resizeTop) {
        setShowResizeHandle('righttop');
      } else if (resizeBottom) {
        setShowResizeHandle('rightbottom');
      } else {
        setShowResizeHandle('right');
      }
    } else if (resizeTop) {
      setShowResizeHandle('top');
    } else if (resizeBottom) {
      setShowResizeHandle('bottom');
    } else {
      setShowResizeHandle(null);
    }
  }, [enableResizeLeft, enableResizeRight, enableResizeTop, enableResizeBottom, position]);


  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (hasCoarsePointer) {
      return undefined;
    }

    window.addEventListener('mousemove', handleWindowMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
    };
  }, [handleWindowMouseMove]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  // A pressed handle names the side it drags, which is what the drag above reads.
  if (hasCoarsePointer) {
    return (
      <>
        {coarsePlacements.map((placement) => (
          <ResizeHandle
            key={placement}
            placement={placement}
            onPointerDown={(event) => {
              setShowResizeHandle(placement);
              handlePointerDown(event);
            }}
          />
        ))}
      </>
    );
  }


  if (!showResizeHandle) {
    return null;
  }


  return (
    <ResizeHandle placement={showResizeHandle} onPointerDown={handlePointerDown} />
  );
  //                                                                                  </editor-fold>
};

Resizer.displayName = 'Resizer';


export { Resizer };
