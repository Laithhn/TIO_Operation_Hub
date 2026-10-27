import { Enumify } from 'enumify';
import PropTypes from 'prop-types';
import {
  useState, useRef, useCallback, useEffect,
} from 'react';
import { useSelector } from 'react-redux';

import defines from 'assets/defines';
import useDimensions from 'components/hooks/useDimensions';
import useDrag from 'components/hooks/useDrag';
import classNames from 'utils/classNames';
import { selectors } from 'store';

import imageViewerDefines from '../defines';
import css from './image.scss';
import withImage from './withImage';


/**
 *
 */
class DraggingState extends Enumify {
  static IDLE = new DraggingState();
  static READY = new DraggingState();
  static DRAGGING = new DraggingState();
  static STOPPED_AFTER_DRAGGING = new DraggingState();
  static STOPPED_WITHOUT_DRAGGING = new DraggingState();
  static _ = this.closeEnum();
}


/**
 * React component of the image in the image viewer.
 */
const Image = ({
  id, src, alt, isRtl, isSelectable, zoom, enableInteractions, fadeOut,
  onImageLoaded, onClick, onSelectPrev, onSelectNext, onZoomInOut,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const viewportWidth = useSelector(selectors.app.getViewportWidth);

  const [panValues, setPanValues] = useState({ byId: {}, overDragX: 0 });

  const imageViewerRef = useRef();
  const imageDimsByIdRef = useRef({});
  const draggingEventsRef = useRef([]);
  const draggingStateRef = useRef(DraggingState.READY);
  const draggingStartTimeMsRef = useRef();
  const prevsRef = useRef({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { clientWidth, clientHeight } = useDimensions(imageViewerRef, { byAnimationFrame: true });

  const onSelectNegDir = isRtl ? onSelectPrev : onSelectNext;
  const onSelectPosDir = isRtl ? onSelectNext : onSelectPrev;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to calculate the limit pan values for both dimensions within which a zoomed
   * image can be moved so that the container is always filled. If the image is not zoomed beyond
   * the container for a dimension, the limit value to pan is 0.
   *
   * @returns {{ xMinMax: number, yMinMax: number }}
   */
  const calcMinMaxPanValues = useCallback(() => {
    const realWidth = (imageDimsByIdRef.current[id]?.width ?? 0) * zoom / 100;
    const realHeight = (imageDimsByIdRef.current[id]?.height ?? 0) * zoom / 100;
    const xMinMax = Math.max((realWidth - clientWidth) / 2, 0);
    const yMinMax = Math.max((realHeight - clientHeight) / 2, 0);

    return { xMinMax, yMinMax };
  }, [id, zoom, clientWidth, clientHeight]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const { dragProps } = useDrag({
    onStartDragging: useCallback((event) => {
      if (enableInteractions) {
        if (event.pointerType === 'touch') {
          draggingEventsRef.current.push(event);
        }
        draggingStateRef.current = DraggingState.READY;
        draggingStartTimeMsRef.current = Date.now();
        prevsRef.current.pinchZoomDist = -1;
      } else {
        draggingStateRef.current = DraggingState.IDLE;
      }
    }, [enableInteractions]),
    onDrag: useCallback((pointerPosX, pointerPosY, pointerDiffX, pointerDiffY, event) => {
      if (
        ((draggingStateRef.current === DraggingState.READY) || (draggingStateRef.current === DraggingState.DRAGGING))
        && (pointerDiffX || pointerDiffY)
      ) {
        // find this event in the event cache and update its record with this event
        const idx = draggingEventsRef.current.findIndex((e) => (e.pointerId === event.pointerId));
        draggingEventsRef.current[idx] = event;

        // minimal movement only does not mean dragging (but clicking)
        if ((Math.abs(pointerPosX) > 5) || (Math.abs(pointerPosY) > 5)) {
          draggingStateRef.current = DraggingState.DRAGGING;
        }

        // -----------------------------------------------------------------------------------------
        if (draggingEventsRef.current.length === 2) { // pinch zoom
        // -----------------------------------------------------------------------------------------

          const pinchZoomDist = Math.sqrt(((draggingEventsRef.current[1].clientX - draggingEventsRef.current[0].clientX) ** 2) + ((draggingEventsRef.current[1].clientY - draggingEventsRef.current[0].clientY) ** 2));

          if (prevsRef.current.pinchZoomDist > 0) {
            const deltaPinchZoomDiff = pinchZoomDist - prevsRef.current.pinchZoomDist;

            if (Math.abs(deltaPinchZoomDiff) > imageViewerDefines.minDeltaPinchZoomDist) {
              onZoomInOut((deltaPinchZoomDiff > 0) ? 1 : -1, { limitToFit: true });
            }
          }

          prevsRef.current.pinchZoomDist = pinchZoomDist;

        // -----------------------------------------------------------------------------------------
        } else { // pan
        // -----------------------------------------------------------------------------------------

          setPanValues((prevValue) => {
            const { xMinMax, yMinMax } = calcMinMaxPanValues();
            let nextX = (prevValue.byId[id]?.x ?? 0) + pointerDiffX,
              nextY = (prevValue.byId[id]?.y ?? 0) + pointerDiffY,
              nextOverDragX = prevValue.overDragX;

            if (event.pointerType === 'touch') {
              // if the next position in direction X is beyond the limit value (touch only), add
              // this overflow for dragging over (in order to swipe the images).
              if (nextX < -xMinMax) {
                nextOverDragX += nextX + xMinMax;
              } else if (nextX > xMinMax) {
                nextOverDragX += nextX - xMinMax;
              }

              // If there is no next / previous image in the direction to drag over, limit this
              // value. It will be moved back to 0 when dragging is finished.
              if (((nextOverDragX > 0) && !onSelectPosDir) || ((nextOverDragX < 0) && !onSelectNegDir)) {
                const absMinMax = Math.round(viewportWidth / 3);
                nextOverDragX = Math.max(Math.min(nextOverDragX, absMinMax), -absMinMax);
              }
            }

            nextX = Math.max(-xMinMax, Math.min(xMinMax, nextX));
            nextY = Math.max(-yMinMax, Math.min(yMinMax, nextY));

            if (
              (nextX === prevValue.byId[id]?.x)
              && (nextY === prevValue.byId[id]?.y)
              && (nextOverDragX === prevValue.overDragX)) {
              return prevValue;
            }

            return {
              byId: {
                ...prevValue.byId,
                [id]: {
                  x: nextX,
                  y: nextY,
                },
              },
              overDragX: nextOverDragX,
            };
          });
        }
      }
    }, [id, onZoomInOut, viewportWidth, onSelectNegDir, onSelectPosDir, calcMinMaxPanValues]),
    onStopDragging: useCallback((event) => {
      if (draggingStateRef.current === DraggingState.DRAGGING) {
        draggingEventsRef.current = [];
        draggingStateRef.current = DraggingState.STOPPED_AFTER_DRAGGING;

        if (event.pointerType === 'touch') {
          const speed = panValues.overDragX / (Date.now() - draggingStartTimeMsRef.current);
          const draggingSpeedThreshold = 1.0;

          if (onSelectPosDir && (speed > draggingSpeedThreshold)) {
            // the image was swiped out in positive X direction with enough speed => select the next
            // image located in this direction (dependent on isRTL)
            setPanValues((prevValue) => ({ ...prevValue, overDragX: viewportWidth }));
            onSelectPosDir();
          } else if (onSelectNegDir && (speed < -draggingSpeedThreshold)) {
            // the image was swiped out in negative X direction with enough speed => select the next
            // image located in this direction (dependent on isRTL)
            setPanValues((prevValue) => ({ ...prevValue, overDragX: -viewportWidth }));
            onSelectNegDir();
          } else {
            // the image was not swiped with enough speed => only move back the image to center
            // position
            setPanValues((prevValue) => ({ ...prevValue, overDragX: 0 }));
          }
        }
      } else if (draggingStateRef.current === DraggingState.READY) {
        // click behaviour for mouse and touch, only if there was no dragging movement
        draggingStateRef.current = DraggingState.STOPPED_WITHOUT_DRAGGING;
        onClick(event.pointerType);
      }
    }, [onClick, viewportWidth, panValues.overDragX, onSelectNegDir, onSelectPosDir]),
  });


  /**
   * Event handler for native event "onLoad" of the image to calculate the minimum ratio value to
   * fit the image into its container.
   */
  const handleLoadImage = (event) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;

    imageDimsByIdRef.current = {
      ...imageDimsByIdRef.current,
      [id]: {
        width: naturalWidth,
        height: naturalHeight,
      },
    };

    onImageLoaded({
      id,
      width: naturalWidth,
      height: naturalHeight,
      ratioToFit: Math.min(clientWidth / naturalWidth, clientHeight / naturalHeight),
    });
  };


  /**
   *
   */
  const handleScrollImage = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onZoomInOut((event.deltaY > 0) ? -1 : 1);
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // Effect to detect changes in the dimensions of the image container.
  useEffect(() => {
    if (
      imageDimsByIdRef.current[id]
      && (
        (clientWidth !== prevsRef.current.clientWidth)
        || (clientHeight !== prevsRef.current.clientHeight)
      )
    ) {
      onImageLoaded({
        id,
        width: imageDimsByIdRef.current[id].width,
        height: imageDimsByIdRef.current[id].height,
        ratioToFit: Math.min(clientWidth / imageDimsByIdRef.current[id].width, clientHeight / imageDimsByIdRef.current[id].height),
      });
    }

    prevsRef.current.clientWidth = clientWidth;
    prevsRef.current.clientHeight = clientHeight;
  }, [id, onImageLoaded, clientWidth, clientHeight]);


  // Effect to correct the stored pan values, if zoom changes.
  useEffect(() => {
    if (zoom !== prevsRef.current.zoom) {
      setPanValues((prevValue) => {
        const { xMinMax, yMinMax } = calcMinMaxPanValues();
        const nextX = Math.max(-xMinMax, Math.min(xMinMax, prevValue.byId[id]?.x ?? 0));
        const nextY = Math.max(-yMinMax, Math.min(yMinMax, prevValue.byId[id]?.y ?? 0));

        if (
          (nextX === prevValue.byId[id]?.x)
          && (nextY === prevValue.byId[id]?.y)
          && (prevValue.overDragX === 0)
        ) {
          return prevValue;
        }

        return {
          byId: {
            ...prevValue.byId,
            [id]: {
              x: nextX,
              y: nextY,
            },
          },
          overDragX: 0,
        };
      });
    }

    prevsRef.current.zoom = zoom;
  }, [id, zoom, calcMinMaxPanValues]);


  useEffect(() => {
    if (id !== prevsRef.current.id) {
      setPanValues((prevValue) => ((prevValue.overDragX !== 0) ? {
        ...prevValue,
        overDragX: 0,
      } : prevValue));
    }

    prevsRef.current.id = id;
  }, [id]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!src) {
    return null;
  }

  const imageClasses = classNames(css.image, {
    [css.fadeOut]: fadeOut,
    [css.isSelectable]: isSelectable,
    [css.scaleImage]: zoom,
  });

  const imgStyle = {
    transform: `translate(${(panValues.byId[id]?.x ?? 0) + (panValues.overDragX ?? 0)}px, ${panValues.byId[id]?.y ?? 0}px)${zoom ? ` scale(${zoom / 100})` : ''}`,
    ...(enableInteractions && {
      transition: `transform ${defines.layout.defaultAnimationTimeMs}ms ease`,
    }),
  };

  return (
    <div
      ref={imageViewerRef}
      className={imageClasses}
    >
      <img
        style={imgStyle}
        src={src}
        alt={alt}
        {...dragProps}
        onLoad={handleLoadImage}
        onWheel={handleScrollImage}
      />
    </div>
  );
  //                                                                                  </editor-fold>
};

Image.displayName = 'Image';

Image.propTypes = {
  id: PropTypes.string,
  src: PropTypes.string,
  alt: PropTypes.string,
  isRtl: PropTypes.bool,
  isSelectable: PropTypes.bool,
  zoom: PropTypes.number,
  enableInteractions: PropTypes.bool,
  fadeOut: PropTypes.bool,
  onImageLoaded: PropTypes.func,
  onClick: PropTypes.func,
  onSelectPrev: PropTypes.func,
  onSelectNext: PropTypes.func,
  onZoomInOut: PropTypes.func,
};

Image.defaultProps = {
  id: null,
  src: null,
  alt: null,
  isRtl: false,
  isSelectable: false,
  zoom: null,
  enableInteractions: false,
  fadeOut: false,
  onImageLoaded() {},
  onClick() {},
  onSelectPrev: null,
  onSelectNext: null,
  onZoomInOut() {},
};

export default withImage(Image);
