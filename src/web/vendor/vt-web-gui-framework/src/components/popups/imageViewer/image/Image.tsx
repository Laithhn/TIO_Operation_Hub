import {
  useCallback, useEffect, useRef, useState,
} from 'react';

import * as appSlice from 'app/app.slice';
import { layout } from 'assets/styles';
import { useDimensions } from 'components/hooks/useDimensions';
import { useDrag } from 'components/hooks/useDrag';
import { useI18n } from 'components/hooks/useI18n';
import { useSelector } from 'components/hooks/useSelector';
import { classNames } from 'utils/classNames';

import * as css from './image.scss';
import type { DraggingStatus, ImageProps, PanValues } from './image.types';
import { useImageChange } from './useImageChange';


/** The smallest change of the distance between two fingers that counts as a pinch, in pixels. */
const minDeltaPinchZoomDist = 2.0;

/** How fast a finger has to leave the image for the gesture to count as a swipe to the next one,
 * in pixels per millisecond. */
const draggingSpeedThreshold = 1.0;

/** How far a finger may pull the image past its edge where there is no image to swipe to, as a
 * fraction of the viewport's width. */
const overDragLimitFactor = 3;


/**
 * React sub-component "Image" of the popup component "ImageViewer": the image itself, with
 * everything the pointer does to it. It can be moved while it is zoomed beyond its container,
 * zoomed by the wheel and by two fingers, and swiped to the image before or after it.
 */
const Image = ({
  id = null, src = null, isSelectable = false,
  onSetImageDelayed, onImageLoaded, onClick, onSelectPrev, onSelectNext,
}: ImageProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = useI18n();
  const viewportWidth = useSelector(appSlice.selectViewportWidth);

  const [panValues, setPanValues] = useState<PanValues>({ byId: {}, overDragX: 0 });

  const imageContrElemRef = useRef<HTMLDivElement>(null);
  const imageDimsByIdRef = useRef<Record<string, { width: number; height: number }>>({});
  const draggingEventsRef = useRef<PointerEvent[]>([]);
  const draggingStatusRef = useRef<DraggingStatus>('ready');
  const draggingStartTimeMsRef = useRef(0);
  // Where the next zoom is to keep the image still, measured from the middle of the container: the
  // cursor for the wheel, the point between two fingers for a pinch. The gesture sets it and the
  // zoom it triggers consumes it; null means the middle itself.
  const zoomAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const prevsRef = useRef<{
    pinchZoomDist?: number; clientWidth?: number; clientHeight?: number; zoom?: number | null;
    shownId?: string;
  }>({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // What the element shows lags behind the props while one image is carried over into the next, so
  // everything below belongs to the shown image rather than to the asked-for one.
  const {
    shownImage, zoom, enableInteractions, fadeOut, stepZoom,
  } = useImageChange({ id, src });
  const shownId = shownImage.id ?? '';

  const { clientWidth, clientHeight } = useDimensions({
    ref: imageContrElemRef,
    byAnimationFrame: true,
  });
  const dimVisibleX = clientWidth ?? 0;
  const dimVisibleY = clientHeight ?? 0;

  // Which way a swipe leads depends on the text direction: a finger going left reaches the next
  // image in a left-to-right document and the previous one in a right-to-left one.
  const onSelectNegDir = isRtl ? onSelectPrev : onSelectNext;
  const onSelectPosDir = isRtl ? onSelectNext : onSelectPrev;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function for how far the image may be moved in either direction so
   * that it still fills its container. A dimension the image does not overflow cannot be moved at
   * all, which is what a limit of zero says.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const calcMinMaxPanValues = useCallback((): { xMinMax: number; yMinMax: number } => {
    const realWidth = (imageDimsByIdRef.current[shownId]?.width ?? 0) * (zoom ?? 0) / 100;
    const realHeight = (imageDimsByIdRef.current[shownId]?.height ?? 0) * (zoom ?? 0) / 100;

    return {
      xMinMax: Math.max((realWidth - dimVisibleX) / 2, 0),
      yMinMax: Math.max((realHeight - dimVisibleY) / 2, 0),
    };
  }, [shownId, zoom, dimVisibleX, dimVisibleY]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the callback prop "onDrag" of the hook "useDrag": two pointers
   * zoom the image, one moves it.
   */
  const handleDrag: NonNullable<Parameters<typeof useDrag>[0]['onDrag']> = ({
    posX, posY, diffX, diffY, event,
  }) => {
    const isDragging = (draggingStatusRef.current === 'ready') || (draggingStatusRef.current === 'dragging');

    if (!isDragging || (!diffX && !diffY)) {
      return;
    }

    // The event cache holds one entry per finger, and this one replaces its own.
    const idx = draggingEventsRef.current.findIndex((cached) => (cached.pointerId === event.pointerId));

    if (idx >= 0) {
      draggingEventsRef.current[idx] = event;
    }

    // A movement of a few pixels is a click that wobbled, not a drag.
    if ((Math.abs(posX) > 5) || (Math.abs(posY) > 5)) {
      draggingStatusRef.current = 'dragging';
    }

    const [firstEvent, secondEvent] = draggingEventsRef.current;

    if ((draggingEventsRef.current.length === 2) && firstEvent && secondEvent) {
      // Two fingers: what changes is the distance between them, and its direction is the zoom's.
      const pinchZoomDist = Math.sqrt(
        ((secondEvent.clientX - firstEvent.clientX) ** 2)
        + ((secondEvent.clientY - firstEvent.clientY) ** 2),
      );
      const prevPinchZoomDist = prevsRef.current.pinchZoomDist ?? -1;

      if (prevPinchZoomDist > 0) {
        const deltaPinchZoomDist = pinchZoomDist - prevPinchZoomDist;

        if (Math.abs(deltaPinchZoomDist) > minDeltaPinchZoomDist) {
          // Two fingers zoom around the point between them, the way the wheel zooms around the
          // cursor, and the anchor is measured from the middle of the container for the same reason.
          const contrRect = imageContrElemRef.current?.getBoundingClientRect();

          if (contrRect) {
            zoomAnchorRef.current = {
              x: ((firstEvent.clientX + secondEvent.clientX) / 2) - contrRect.left - (contrRect.width / 2),
              y: ((firstEvent.clientY + secondEvent.clientY) / 2) - contrRect.top - (contrRect.height / 2),
            };
          }

          stepZoom((deltaPinchZoomDist > 0) ? 1 : -1, { limitToFit: true });
        }
      }

      prevsRef.current.pinchZoomDist = pinchZoomDist;

      return;
    }

    // One finger or the mouse: the image moves, and a finger may pull it past its edge.
    setPanValues((prevPanValues) => {
      const { xMinMax, yMinMax } = calcMinMaxPanValues();
      const prevPan = prevPanValues.byId[shownId];
      let nextX = (prevPan?.x ?? 0) + diffX,
        nextY = (prevPan?.y ?? 0) + diffY,
        nextOverDragX = prevPanValues.overDragX;

      if (event.pointerType === 'touch') {
        if (nextX < -xMinMax) {
          nextOverDragX += nextX + xMinMax;
        } else if (nextX > xMinMax) {
          nextOverDragX += nextX - xMinMax;
        }

        // Where there is no image to swipe to, the pull has an end of its own, and the image
        // springs back to the middle once the finger lifts.
        if (((nextOverDragX > 0) && !onSelectPosDir) || ((nextOverDragX < 0) && !onSelectNegDir)) {
          const absMinMax = Math.round(viewportWidth / overDragLimitFactor);

          nextOverDragX = Math.max(Math.min(nextOverDragX, absMinMax), -absMinMax);
        }
      }

      // A zoom in on the cursor may leave the image further out than a drag of its own is allowed to
      // take it, the limit being zero for as long as the image is smaller than its container. The
      // drag keeps what the zoom set instead of yanking the image to the middle, and every pixel
      // towards the middle narrows what it may keep - the alignment of the next zoom out then meets
      // an image that is already where it belongs.
      const xLimit = Math.max(xMinMax, Math.abs(prevPan?.x ?? 0));
      const yLimit = Math.max(yMinMax, Math.abs(prevPan?.y ?? 0));

      nextX = Math.max(-xLimit, Math.min(xLimit, nextX));
      nextY = Math.max(-yLimit, Math.min(yLimit, nextY));

      if (
        (nextX === prevPan?.x) && (nextY === prevPan.y)
        && (nextOverDragX === prevPanValues.overDragX)
      ) {
        return prevPanValues;
      }

      return {
        byId: { ...prevPanValues.byId, [shownId]: { x: nextX, y: nextY } },
        overDragX: nextOverDragX,
      };
    });
  };


  /**
   * Handler for the callback prop "onStopDragging" of the hook "useDrag". A
   * gesture that moved the image ends either in a swipe to the next image or in a way back to the
   * middle; one that did not move it was a click.
   */
  const handleStopDragging = (event: PointerEvent) => {
    if (draggingStatusRef.current === 'dragging') {
      draggingEventsRef.current = [];
      draggingStatusRef.current = 'stoppedAfterDragging';

      if (event.pointerType === 'touch') {
        const speed = panValues.overDragX / (Date.now() - draggingStartTimeMsRef.current);

        if (onSelectPosDir && (speed > draggingSpeedThreshold)) {
          setPanValues((prevPanValues) => ({ ...prevPanValues, overDragX: viewportWidth }));
          onSelectPosDir();
        } else if (onSelectNegDir && (speed < -draggingSpeedThreshold)) {
          setPanValues((prevPanValues) => ({ ...prevPanValues, overDragX: -viewportWidth }));
          onSelectNegDir();
        } else {
          setPanValues((prevPanValues) => ({ ...prevPanValues, overDragX: 0 }));
        }
      }
    } else if (draggingStatusRef.current === 'ready') {
      draggingStatusRef.current = 'stoppedWithoutDragging';
      onClick?.({ pointerType: event.pointerType, event });
    }
  };


  const { dragProps } = useDrag<HTMLImageElement>({
    onStartDragging: (event) => {
      if (!enableInteractions) {
        draggingStatusRef.current = 'idle';

        return;
      }

      if (event.pointerType === 'touch') {
        draggingEventsRef.current.push(event.nativeEvent);
      }

      draggingStatusRef.current = 'ready';
      draggingStartTimeMsRef.current = Date.now();
      prevsRef.current.pinchZoomDist = -1;
    },
    onDrag: handleDrag,
    onStopDragging: handleStopDragging,
  });


  /**
   * Handler for the React event "onLoad" of the image: its natural size is known only now, and with
   * it the zoom at which it fits into the space it has.
   */
  const handleLoadImage = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;

    imageDimsByIdRef.current = {
      ...imageDimsByIdRef.current,
      [shownId]: { width: naturalWidth, height: naturalHeight },
    };

    onImageLoaded?.({
      id: shownId,
      width: naturalWidth,
      height: naturalHeight,
      ratioToFit: Math.min(dimVisibleX / naturalWidth, dimVisibleY / naturalHeight),
    });
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // Registers the wheel, which zooms here rather than scrolling anything. It is a listener of its
  // own instead of the React event "onWheel", because React registers that one passively at the
  // root of the document: "preventDefault" has no effect there, the page behind the viewer scrolls
  // along, and Chrome warns about the attempt.
  useEffect(() => {
    const imageContrElem = imageContrElemRef.current;

    if (!imageContrElem) {
      return undefined;
    }

    const handleWheelImage = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      // The point under the cursor is the one the zoom keeps still, so the wheel hands its position
      // on. The middle of the container is where it is measured from, because that is where the
      // image is centred and where its scale grows from.
      const {
        left, top, width, height,
      } = imageContrElem.getBoundingClientRect();

      zoomAnchorRef.current = {
        x: event.clientX - left - (width / 2),
        y: event.clientY - top - (height / 2),
      };
      stepZoom((event.deltaY > 0) ? -1 : 1);
    };

    // A wheel at the last step changes no zoom, which leaves its anchor unconsumed. The cursor
    // leaving the image ends it: the next zoom is then the toolbar's, and that one grows from the
    // middle.
    const handlePointerLeaveImage = () => {
      zoomAnchorRef.current = null;
    };

    imageContrElem.addEventListener('wheel', handleWheelImage, { passive: false });
    imageContrElem.addEventListener('pointerleave', handlePointerLeaveImage);

    return () => {
      imageContrElem.removeEventListener('wheel', handleWheelImage);
      imageContrElem.removeEventListener('pointerleave', handlePointerLeaveImage);
    };
  }, [stepZoom]);


  // Reports the fitting zoom anew whenever the space the image has changes: the image is the same,
  // but what fits into the container is not.
  useEffect(() => {
    const imageDims = imageDimsByIdRef.current[shownId];

    if (
      imageDims
      && ((dimVisibleX !== prevsRef.current.clientWidth) || (dimVisibleY !== prevsRef.current.clientHeight))
    ) {
      onImageLoaded?.({
        id: shownId,
        width: imageDims.width,
        height: imageDims.height,
        ratioToFit: Math.min(dimVisibleX / imageDims.width, dimVisibleY / imageDims.height),
      });
    }

    prevsRef.current.clientWidth = dimVisibleX;
    prevsRef.current.clientHeight = dimVisibleY;
  }, [shownId, onImageLoaded, dimVisibleX, dimVisibleY]);


  // Moves the image with a zoom: an anchored one keeps the point it was centred on where it is, and
  // a zoom out aligns the image to its container afterwards, because what was a legal place at one
  // zoom can lie outside the image at the next.
  useEffect(() => {
    const prevZoom = prevsRef.current.zoom;

    if (zoom !== prevZoom) {
      // The image has to take over the share of the anchor's distance from the middle that the zoom
      // added: a point that stood 100 pixels out at 100 % stands 200 out at 200 %, so the image
      // moves back by those 100 to leave it where it was. Without an anchor - the header's zoom -
      // the middle of the container stays the centre of the zoom.
      const anchor = zoomAnchorRef.current;
      const zoomRatio = (zoom && prevZoom) ? (zoom / prevZoom) : null;
      // Aligning the image to its container belongs to the zoom out, which is where an image grown
      // smaller than its space has to find the middle of it again. A zoom in answers to its anchor
      // alone: an image not yet larger than its space has a limit of zero in that dimension, and
      // the alignment would pull every step of it back to the middle.
      const isAlignedToContr = !anchor || !zoomRatio || (zoomRatio < 1);

      zoomAnchorRef.current = null;

      setPanValues((prevPanValues) => {
        const { xMinMax, yMinMax } = calcMinMaxPanValues();
        const prevPan = prevPanValues.byId[shownId];
        const anchoredX = (anchor && zoomRatio)
          ? ((zoomRatio * (prevPan?.x ?? 0)) + ((1 - zoomRatio) * anchor.x))
          : (prevPan?.x ?? 0);
        const anchoredY = (anchor && zoomRatio)
          ? ((zoomRatio * (prevPan?.y ?? 0)) + ((1 - zoomRatio) * anchor.y))
          : (prevPan?.y ?? 0);
        const nextX = isAlignedToContr ? Math.max(-xMinMax, Math.min(xMinMax, anchoredX)) : anchoredX;
        const nextY = isAlignedToContr ? Math.max(-yMinMax, Math.min(yMinMax, anchoredY)) : anchoredY;

        if ((nextX === prevPan?.x) && (nextY === prevPan.y) && (prevPanValues.overDragX === 0)) {
          return prevPanValues;
        }

        return {
          byId: { ...prevPanValues.byId, [shownId]: { x: nextX, y: nextY } },
          overDragX: 0,
        };
      });
    }

    prevsRef.current.zoom = zoom;
  }, [shownId, zoom, calcMinMaxPanValues]);


  // Ends the pull past the edge with the image it belonged to, and reports the image that is now on
  // screen - which is what keeps the header telling of the image the user sees.
  useEffect(() => {
    if (shownId !== prevsRef.current.shownId) {
      setPanValues((prevPanValues) => (
        (prevPanValues.overDragX === 0) ? prevPanValues : { ...prevPanValues, overDragX: 0 }
      ));
      onSetImageDelayed?.({ id: shownImage.id });
    }

    prevsRef.current.shownId = shownId;
  }, [shownId, shownImage.id, onSetImageDelayed]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!shownImage.src) {
    return null;
  }

  const imageClasses = classNames(css.image, {
    [css.fadeOut]: fadeOut,
    [css.isSelectable]: isSelectable,
    // A zoomed image is no longer held inside its container by the stylesheet: its size is the
    // transform's to decide from here on.
    [css.scaleImage]: !!zoom,
  });

  const panX = (panValues.byId[shownId]?.x ?? 0) + panValues.overDragX;
  const panY = panValues.byId[shownId]?.y ?? 0;
  const imgStyle: React.CSSProperties = {
    transform: `translate(${panX}px, ${panY}px)${zoom ? ` scale(${zoom / 100})` : ''}`,
    // A standing image follows its transform with an animation; one that is being dragged has to
    // stay under the finger.
    ...(enableInteractions && { transition: `transform ${layout.animationTime.slowMs}ms ease` }),
  };

  return (
    <div ref={imageContrElemRef} className={imageClasses}>
      <img
        style={imgStyle}
        src={shownImage.src}
        alt={shownId}
        {...dragProps}
        onLoad={handleLoadImage}
      />
    </div>
  );
  //                                                                                  </editor-fold>
};

Image.displayName = 'Image';


export { Image };
