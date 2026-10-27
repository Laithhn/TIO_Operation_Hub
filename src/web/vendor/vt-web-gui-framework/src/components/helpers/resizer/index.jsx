import PropTypes from 'prop-types';
import {
  memo, useState, useCallback, useEffect,
} from 'react';

import defines from 'assets/defines';
import useDrag from 'components/hooks/useDrag';

import ResizeHandle from './resizeHandle';


/**
 * Memoized React component to add handles at the sides and corners of absolute positioned
 * containers to resize them with the mouse.
 */
const Resizer = memo(({
  enableResizeLeft, enableResizeRight, enableResizeTop, enableResizeBottom, position, onSetPosition,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [showResizeHandle, setShowResizeHandle] = useState(null);


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

  const { dragProps: { onPointerDown: handlePointerDown } } = useDrag({
    rangeX: [0, document.documentElement.clientWidth],
    rangeY: [0, document.documentElement.clientHeight],
    onDrag: useCallback((pointerPosX, pointerPosY, pointerDiffX, pointerDiffY) => {
      switch (showResizeHandle) {
        case 'lefttop':
          onSetPosition((prevPosition) => ({
            ...prevPosition,
            left: prevPosition.left + pointerDiffX,
            width: prevPosition.width - pointerDiffX,
            top: prevPosition.top + pointerDiffY,
            height: prevPosition.height - pointerDiffY,
          }));
          break;

        case 'top':
          onSetPosition((prevPosition) => ({
            ...prevPosition,
            top: prevPosition.top + pointerDiffY,
            height: prevPosition.height - pointerDiffY,
          }));
          break;

        case 'righttop':
          onSetPosition((prevPosition) => ({
            ...prevPosition,
            width: prevPosition.width + pointerDiffX,
            top: prevPosition.top + pointerDiffY,
            height: prevPosition.height - pointerDiffY,
          }));
          break;

        case 'right':
          onSetPosition((prevPosition) => ({
            ...prevPosition,
            width: prevPosition.width + pointerDiffX,
          }));
          break;

        case 'rightbottom':
          onSetPosition((prevPosition) => ({
            ...prevPosition,
            width: prevPosition.width + pointerDiffX,
            height: prevPosition.height + pointerDiffY,
          }));
          break;

        case 'bottom':
          onSetPosition((prevPosition) => ({
            ...prevPosition,
            height: prevPosition.height + pointerDiffY,
          }));
          break;

        case 'leftbottom':
          onSetPosition((prevPosition) => ({
            ...prevPosition,
            left: prevPosition.left + pointerDiffX,
            width: prevPosition.width - pointerDiffX,
            height: prevPosition.height + pointerDiffY,
          }));
          break;

        case 'left':
          onSetPosition((prevPosition) => ({
            ...prevPosition,
            left: prevPosition.left + pointerDiffX,
            width: prevPosition.width - pointerDiffX,
          }));
          break;

        // no default
      }
    }, [onSetPosition, showResizeHandle]),
  });


  /**
   *
   */
  const handleWindowMouseMove = useCallback((event) => {
    const resizeLeft = enableResizeLeft && (event.clientX - position.left) < defines.layout.resizableSnapDim;
    const resizeRight = enableResizeRight && (position.left + position.width - event.clientX) < defines.layout.resizableSnapDim;
    const resizeTop = enableResizeTop && (event.clientY - position.top) < defines.layout.resizableSnapDim;
    const resizeBottom = enableResizeBottom && (position.top + position.height - event.clientY) < defines.layout.resizableSnapDim;

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
    window.addEventListener('mousemove', handleWindowMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
    };
  }, [handleWindowMouseMove]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!showResizeHandle) {
    return null;
  }

  return (
    <ResizeHandle
      placement={showResizeHandle}
      onPointerDown={handlePointerDown}
    />
  );
  //                                                                                  </editor-fold>
});

Resizer.displayName = 'Resizer';

Resizer.propTypes = {
  enableResizeLeft: PropTypes.bool,
  enableResizeRight: PropTypes.bool,
  enableResizeTop: PropTypes.bool,
  enableResizeBottom: PropTypes.bool,
  position: PropTypes.shape({
    left: PropTypes.number,
    width: PropTypes.number,
    top: PropTypes.number,
    height: PropTypes.number,
  }),
  onSetPosition: PropTypes.func,
};

Resizer.defaultProps = {
  enableResizeLeft: false,
  enableResizeRight: false,
  enableResizeTop: false,
  enableResizeBottom: false,
  position: {
    left: 0,
    width: 0,
    top: 0,
    height: 0,
  },
  onSetPosition() {},
};

export { ResizeHandle };
export default Resizer;
