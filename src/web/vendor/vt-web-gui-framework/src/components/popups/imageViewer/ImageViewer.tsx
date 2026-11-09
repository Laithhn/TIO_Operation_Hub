import {
  useCallback, useEffect, useMemo, useReducer, useState,
} from 'react';
import { createPortal } from 'react-dom';

import { useFadeInOut } from 'components/hooks/useFadeInOut';
import { useI18n } from 'components/hooks/useI18n';
import { classNames } from 'utils/classNames';

import { Header } from './header/Header';
import { Image } from './image/Image';
import type { ImageProps } from './image/image.types';
import { ImageDataContext } from './imageData.context';
import {
  imageDataInitialArg, imageDataReducer, setDims, setFittingRatio,
} from './imageData.reducer';
import * as css from './imageViewer.scss';
import type { ImageViewerImageId, ImageViewerImages, ImageViewerProps } from './imageViewer.types';
import { NaviButton } from './naviButton/NaviButton';
import { Preview } from './preview/Preview';
import { useImages } from './useImages';


const portalCntr = document.getElementById(process.env['ELEM_ID_TEMP'] ?? '');

// A stylesheet exports its values as strings, so the number is made once, here.
const showHideTransitionTimeMs = Number(css.showHideTransitionTimeMs);

/** The viewer without images, as one object rather than a literal in the default of the prop: a
 * literal is a new object on every render and would pull every render after it. */
const noImages: ImageViewerImages = {};

/** What the header tells of, which follows the image on screen rather than the selected one: the
 * image is carried over into the next one with a fade, and a header changing ahead of it would name
 * an image that is not there yet. */
interface DelayedImage {
  id: ImageViewerImageId | null;
  idx: number;
  subtitle: string | number;
}


/**
 * React component of the popup component "ImageViewer": a viewer that fills the window and shows a
 * set of images one at a time, with a strip of thumbnails below and the image switched by clicking,
 * by the arrow keys, by the buttons beside it or by swiping. A zoomed image can be moved, and the
 * viewer reports its closing rather than closing itself.
 */
const ImageViewer = ({
  title = '', subtitle = '', backgroundImage = '', images = noImages, startId = null,
  followImages = false, isMobile = false, enableZoom = false, showDimensions = false,
  onSelect, onClose,
}: ImageViewerProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = useI18n();

  const [imageDataState, imageDataDispatch] = useReducer(imageDataReducer, imageDataInitialArg);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isMouse, setIsMouse] = useState(false);
  const [delayedImage, setDelayedImage] = useState<DelayedImage>({ id: null, idx: -1, subtitle: '' });


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const {
    imagesById, allImageIds, selectedId, selectById, selectPrevId, selectNextId,
  } = useImages({ images, startId, followImages });

  // The viewer is invisible for its first render and fades in from the second, which is what gives
  // the transition of the stylesheet something to run from.
  const { visibility } = useFadeInOut({ show: true, fadeInTimeMs: showHideTransitionTimeMs });
  const isViewerVisible = ((visibility === 'fadeIn') || (visibility === 'show'));

  const numImages = allImageIds.length;
  const selectedIdx = allImageIds.indexOf(selectedId ?? '');
  const isImageSelectable = (onSelect !== undefined);
  const canNaviPrev = (selectedIdx > 0);
  const canNaviNext = (selectedIdx < (numImages - 1));
  // The buttons beside the image belong to the mouse: they are there while one is over the viewer,
  // and never on a mobile device.
  const showNaviPrev = (!isMobile && isMouse && canNaviPrev);
  const showNaviNext = (!isMobile && isMouse && canNaviNext);

  // The image data reaches the header and the image through a context rather than through props:
  // the image measures, the header reads, and the two are not neighbours. It keeps its useMemo
  // because it is a context value: react/jsx-no-constructed-context-values, which does not know the
  // React Compiler, asks for a memoized one.
  const imageDataContextValue = useMemo(() => ({ imageDataState, imageDataDispatch }), [imageDataState]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the callback prop "onSetImageDelayed" of the image, which reports
   * the image that has arrived on screen. What the header shows is written down here, so that the
   * subtitle of a function is asked once per image rather than on every render.
   */
  const handleSetImageDelayed: NonNullable<ImageProps['onSetImageDelayed']> = ({ id }) => {
    // The subtitle belongs to the call site, and a function of it is asked here rather than in the
    // updater below: React calls an updater twice in StrictMode, and what it calls has to be pure.
    const subtitleOfId = ((typeof subtitle === 'function') && (id !== null))
      ? subtitle(id)
      : (subtitle as string | number);

    setDelayedImage((prevDelayedImage) => (
      (
        (id === prevDelayedImage.id)
        && (selectedIdx === prevDelayedImage.idx)
        && (subtitleOfId === prevDelayedImage.subtitle)
      )
        ? prevDelayedImage
        : { id, idx: selectedIdx, subtitle: subtitleOfId }
    ));
  };


  /**
   * Handler for the callback prop "onImageLoaded" of the image: what the image
   * has measured of itself goes into the image data, and the zoom it would fit at only where the
   * viewer allows zooming at all.
   */
  const handleImageLoaded: NonNullable<ImageProps['onImageLoaded']> = ({
    id, width, height, ratioToFit,
  }) => {
    imageDataDispatch(setDims(id, width, height));

    if (enableZoom) {
      imageDataDispatch(setFittingRatio(id, ratioToFit));
    }
  };


  /**
   * Handler for the callback prop "onClick" of the image. A mouse selects the image where the call
   * site takes a selection; a finger expands it, there being no second pointer button to do it
   * with.
   */
  const handleClickImage: NonNullable<ImageProps['onClick']> = ({ pointerType, event }) => {
    if (isImageSelectable && (pointerType === 'mouse') && (selectedId !== null)) {
      onSelect({ id: selectedId, event });
    }

    if (pointerType === 'touch') {
      setIsExpanded((prevIsExpanded) => !prevIsExpanded);
    }
  };


  /**
   * Handler for the native event "keydown" of the window: the keys that switch
   * the image and the one that closes the viewer. A key held together with a modifier is none of
   * them.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const handleWindowKeyDown = useCallback((event: KeyboardEvent) => {
    // A key carrying Ctrl, Alt or the Meta key belongs to the browser or to the system: Ctrl+1 and
    // Cmd+1 switch the browser tab, and selecting the first image on top of that is nobody's wish.
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    // The arrow keys follow what the user sees, so the pair swaps in a right-to-left document,
    // where the first image lies on the right.
    const selectBackward = isRtl ? selectNextId : selectPrevId;
    const selectForward = isRtl ? selectPrevId : selectNextId;

    if (event.key === 'Escape') {
      onClose?.({ event });
    } else if (event.key === 'ArrowLeft') {
      selectBackward();
    } else if (event.key === 'ArrowRight') {
      selectForward();
    } else if ((event.key === 'Home') && (numImages > 0)) {
      selectById(allImageIds[0] ?? '');
    } else if ((event.key === 'End') && (numImages > 0)) {
      selectById(allImageIds[numImages - 1] ?? '');
    } else if (/^[1-9]$/.test(event.key)) {
      // The digits reach the first nine images directly.
      const idx = parseInt(event.key, 10) - 1;

      if (numImages > idx) {
        selectById(allImageIds[idx] ?? '');
      }
    }
  }, [onClose, isRtl, allImageIds, numImages, selectById, selectPrevId, selectNextId]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    window.addEventListener('keydown', handleWindowKeyDown);

    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [handleWindowKeyDown]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const imageViewerClasses = classNames(css.imageViewer, {
    [css.visible]: isViewerVisible,
  });

  const contrClasses = classNames(css.contr, {
    [css.isMobile]: isMobile,
    [css.isExpanded]: isExpanded,
  });

  const content = (
    <ImageDataContext.Provider value={imageDataContextValue}>
      <div
        className={imageViewerClasses}
        onWheel={(event) => {
          // The viewer covers the page, and a wheel over it is meant for the image rather than for
          // whatever lies behind.
          event.stopPropagation();
        }}
      >
        <div
          className={css.backgroundImage}
          {...(backgroundImage && { style: { backgroundImage: `url(${backgroundImage})` } })}
        />
        <div
          className={contrClasses}
          {...(!isMobile && {
            onMouseEnter: () => {
              setIsMouse(true);
            },
            onMouseLeave: () => {
              setIsMouse(false);
            },
          })}
        >
          <Header
            title={title}
            subtitle={delayedImage.subtitle}
            showDimensions={showDimensions}
            numImages={numImages}
            imageId={delayedImage.id}
            imageIdx={delayedImage.idx}
            isMobile={isMobile}
            isExpanded={isExpanded}
            onToggleExpand={() => {
              setIsExpanded((prevIsExpanded) => !prevIsExpanded);
            }}
            onOpenImage={() => {
              window.open(imagesById[selectedId ?? ''], '_blank');
            }}
            {...(onClose && { onClose })}
          />
          <Image
            id={selectedId}
            src={imagesById[selectedId ?? ''] ?? null}
            isSelectable={isImageSelectable}
            onSetImageDelayed={handleSetImageDelayed}
            onImageLoaded={handleImageLoaded}
            onClick={handleClickImage}
            {...(canNaviPrev && { onSelectPrev: selectPrevId })}
            {...(canNaviNext && { onSelectNext: selectNextId })}
          />
          <Preview
            selectedId={selectedId}
            images={imagesById}
            isMobile={isMobile}
            onSelect={({ id }) => {
              selectById(id);
            }}
          />
          <NaviButton
            pos={isRtl ? 'right' : 'left'}
            visible={showNaviPrev}
            isExpanded={isExpanded}
            onClick={selectPrevId}
          />
          <NaviButton
            pos={isRtl ? 'left' : 'right'}
            visible={showNaviNext}
            isExpanded={isExpanded}
            onClick={selectNextId}
          />
        </div>
      </div>
    </ImageDataContext.Provider>
  );

  if (!portalCntr) {
    return content;
  }

  return createPortal(content, portalCntr);
  //                                                                                  </editor-fold>
};

ImageViewer.displayName = 'ImageViewer';


export { ImageViewer };
