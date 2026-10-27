import PropTypes from 'prop-types';
import {
  memo, useReducer, useState, useMemo, useCallback, useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';

import { selectors } from 'store';
import classNames from 'utils/classNames';

import Header from './header';
import Image from './image';
import NaviButton from './naviButton';
import Preview from './preview';
import css from './imageViewer.scss';
import useImages from './useImages';
import imageDataReducer, { ImageDataContext, initialState as initialImageDataState, actions as imageDataActions } from './imageDataReducer';


/**
 * React component of the image viewer.
 */
const ImageViewer = memo(({
  title, subtitle, backgroundImage, images, startId, isMobile, enableZoom, showDimensions, onSelect,
  onClose,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const isRtl = useSelector(selectors.i18n.isCurrentLanguageRtl);

  const [imageDataState, imageDataDispatch] = useReducer(imageDataReducer, initialImageDataState());

  const [visible, setVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMouse, setIsMouse] = useState(false);
  const [delayedImage, setDelayedImage] = useState({ id: null, idx: -1, subtitle: '' });


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const {
    imagesById, allImageIds, selectedId, selectById, selectPrevId, selectNextId,
  } = useImages(images, startId);

  const selectedSrc = imagesById[selectedId];
  const numImages = allImageIds.length;
  const selectedIdx = allImageIds.indexOf(selectedId ?? '');
  const isImageSelectable = (typeof onSelect === 'function');
  const canNaviPrev = (selectedIdx > 0);
  const canNaviNext = (selectedIdx < (numImages - 1));

  const imageDataContextValue = useMemo(() => ({
    imageDataState, imageDataDispatch,
  }), [imageDataState, imageDataDispatch]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Event handler for native event "mouseenter" to detect if a mouse is used. Not available at
   * mobile devices (see prop isMobile).
   */
  const handleMouseEnter = () => {
    setIsMouse(true);
  };


  /**
   * Event handler for native event "mouseleave" to detect there is no mouse or the mouse has left.
   * Not available at mobile devices (see prop isMobile).
   */
  const handleMouseLeave = () => {
    setIsMouse(false);
  };


  /**
   *
   */
  const handleSetImageDelayed = useCallback((id) => {
    setDelayedImage((prevValue) => {
      const subtitleOfId = (typeof subtitle === 'function') ? subtitle(id) : subtitle;

      return (
        (id === prevValue.id)
        && (selectedIdx === prevValue.idx)
        && (subtitleOfId === prevValue.subtitle)
      )
        ? prevValue
        : {
          id,
          idx: selectedIdx,
          subtitle: subtitleOfId,
        };
    });
  }, [subtitle, selectedIdx]);


  /**
   *
   */
  const handleImageLoaded = useCallback(({
    id, width, height, ratioToFit,
  }) => {
    imageDataDispatch(imageDataActions.setDims(id, { width, height }));

    if (enableZoom) {
      imageDataDispatch(imageDataActions.setFittingRatio(id, ratioToFit));
    }
  }, [enableZoom]);


  /**
   *
   */
  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prevValue) => !prevValue);
  }, []);


  /**
   *
   */
  const handleOpenImage = useCallback(() => {
    window.open(selectedSrc, '_blank');
  }, [selectedSrc]);


  /**
   * Memoized handler for mouse and touch event "onClick" on the image.
   */
  const handleClickImage = useCallback((pointerType) => {
    // behaviour for mouse
    if (isImageSelectable && (pointerType === 'mouse')) {
      onSelect(selectedId);
    }

    // behaviour for touch
    if (pointerType === 'touch') {
      handleToggleExpand();
    }
  }, [onSelect, selectedId, isImageSelectable, handleToggleExpand]);


  /**
   * Memoized handler for event "key down" on the window element.
   */
  const handleWindowKeyDown = useCallback((event) => {
    switch (event.key) {
      case 'Escape':
        onClose();
        break;

      case 'ArrowLeft':
        if (isRtl) {
          selectNextId();
        } else {
          selectPrevId();
        }
        break;

      case 'ArrowRight':
        if (isRtl) {
          selectPrevId();
        } else {
          selectNextId();
        }
        break;

      case 'Home':
        if (numImages > 0) {
          selectById(allImageIds[0]);
        }
        break;

      case 'End':
        if (numImages > 0) {
          selectById(allImageIds[numImages - 1]);
        }
        break;

      default:
        if (/^[1-9]$/.test(event.key)) {
          const idx = parseInt(event.key, 10) - 1;

          if (numImages > idx) {
            selectById(allImageIds[idx]);
          }
        }
        break;
    }
  }, [onClose, isRtl, allImageIds, numImages, selectById, selectPrevId, selectNextId]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    setVisible(true);
  }, []);


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
    [css.visible]: visible,
  });

  const backgroundImageStyle = (backgroundImage
    ? { backgroundImage: `url(${backgroundImage})` }
    : {}
  );

  const contrClasses = classNames(css.contr, {
    [css.isMobile]: isMobile,
    [css.isExpanded]: isExpanded,
  });

  return createPortal(
    <ImageDataContext.Provider value={imageDataContextValue}>
      <div
        className={imageViewerClasses}
        onWheel={(event) => event.stopPropagation()}
      >
        <div className={css.backgroundImage} style={backgroundImageStyle} />
        <div
          className={contrClasses}
          {...(!isMobile && {
            onMouseEnter: handleMouseEnter,
            onMouseLeave: handleMouseLeave,
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
            onToggleExpand={handleToggleExpand}
            onOpenImage={handleOpenImage}
            onClose={onClose}
          />
          <Image
            id={selectedId}
            src={selectedSrc}
            isRtl={isRtl}
            isSelectable={isImageSelectable}
            onSetImageDelayed={handleSetImageDelayed}
            onImageLoaded={handleImageLoaded}
            onClick={handleClickImage}
            {...(canNaviPrev && { onSelectPrev: selectPrevId })}
            {...(canNaviNext && { onSelectNext: selectNextId })}
          />
          <Preview
            isRtl={isRtl}
            selectedId={selectedId}
            images={imagesById}
            isMobile={isMobile}
            onSelect={selectById}
          />
          <NaviButton
            pos={isRtl ? 'right' : 'left'}
            visible={!isMobile && isMouse && canNaviPrev}
            isExpanded={isExpanded}
            onClick={selectPrevId}
          />
          <NaviButton
            pos={isRtl ? 'left' : 'right'}
            visible={!isMobile && isMouse && canNaviNext}
            isExpanded={isExpanded}
            onClick={selectNextId}
          />
        </div>
      </div>
    </ImageDataContext.Provider>,
    document.getElementById(process.env.ELEM_ID_TEMP),
  );
  //                                                                                  </editor-fold>
}, (prevProps, nextProps) => (
  !nextProps.refreshProps
  || (
    (prevProps.title === nextProps.title)
    && (prevProps.subtitle === nextProps.subtitle)
    && (prevProps.backgroundImage === nextProps.backgroundImage)
    && (prevProps.images === nextProps.images)
    && (prevProps.startId === nextProps.startId)
    && (prevProps.isMobile === nextProps.isMobile)
    && (prevProps.onSelect === nextProps.onSelect)
    && (prevProps.onClose === nextProps.onClose)
  )
));

ImageViewer.displayName = 'ImageViewer';

ImageViewer.propTypes = {
  refreshProps: PropTypes.bool, // eslint-disable-line react/no-unused-prop-types
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.func]),
  backgroundImage: PropTypes.string,
  images: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.object,
  ]),
  startId: PropTypes.string,
  isMobile: PropTypes.bool,
  enableZoom: PropTypes.bool,
  showDimensions: PropTypes.bool,
  onSelect: PropTypes.func,
  onClose: PropTypes.func,
};

ImageViewer.defaultProps = {
  refreshProps: false,
  title: '',
  subtitle: '',
  backgroundImage: '',
  images: {},
  startId: null,
  isMobile: false,
  enableZoom: false,
  showDimensions: false,
  onSelect: null,
  onClose() {},
};

export default ImageViewer;
