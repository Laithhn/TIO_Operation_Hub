import PropTypes from 'prop-types';
import {
  useState, useRef, useMemo, useCallback, useEffect,
} from 'react';

import Enums from 'assets/enums';
import Button, { ButtonType } from 'components/controls/button/index';
import {
  useScrollHandlers, convertScrollLeftOfElement, scrollLeftTo, scrollLeftDiff,
} from 'components/helpers/scrolling';
import classNames from 'utils/classNames';

import PreviewImage from './previewImage';
import imageViewerDefines from '../defines';
import css from './preview.scss';


/**
 * Stateful container React component of the preview section of the image viewer.
 */
const Preview = ({
  isRtl, selectedId, images, isMobile, onSelect,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [imageWidths, setImageWidths] = useState({});
  const [enableScrollPrev, setEnableScrollPrev] = useState(false);
  const [enableScrollNext, setEnableScrollNext] = useState(false);

  const previewContrWrapperRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const imageIds = useMemo(() => Object.keys(images), [images]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper method to scroll the preview images.
   */
  const scroll = useCallback((scrollLeft, duration = imageViewerDefines.imageChangeTransitionTimeMs) => {
    scrollLeftTo(
      previewContrWrapperRef.current,
      scrollLeft,
      { isRtl, duration, easing: 'easeInOutQuad' },
    );
  }, [isRtl]);


  /**
   *
   */
  const scrollToSelectedImage = useCallback(() => {
    const { clientWidth } = previewContrWrapperRef.current;
    const doubleBorder = imageViewerDefines.previewImages.borderWidth * 2;
    const width = imageWidths[selectedId] ?? doubleBorder;
    let left = 0;

    imageIds.some((id) => {
      if (id === selectedId) {
        return true;
      }

      left += (imageWidths[id] ?? 0) + imageViewerDefines.previewImages.columnGap;
      return false;
    });

    scroll(left - ((clientWidth - width) / 2));
  }, [selectedId, imageWidths, imageIds, scroll]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const scrollHandlersProps = useScrollHandlers({
    enableWheel: true,
    enableTouch: true,
    onChangeX: useCallback((delta) => {
      scrollLeftDiff(
        previewContrWrapperRef.current,
        delta,
        { isRtl, duration: 0 },
      );
    }, [isRtl]),
  });


  /**
   * Event handle for checking at every DOM change, if the scroll buttons have to be shown or not.
   * Note that the value of scrollLeft is negative, if the direction is right-to-left is true.
   */
  const handleDomChange = useCallback(() => {
    if (previewContrWrapperRef.current) {
      const { clientWidth, scrollWidth } = previewContrWrapperRef.current;
      const scrollLeft = convertScrollLeftOfElement(previewContrWrapperRef.current, isRtl);

      const enableScrolling = (scrollWidth > clientWidth);

      setEnableScrollPrev(enableScrolling && (scrollLeft > 0));
      setEnableScrollNext(enableScrolling && ((scrollLeft + clientWidth) < scrollWidth));
    }
  }, [isRtl]);


  /**
   * Event handler for clicking the button to navigate the preview images to the previous ones. Note
   * that the value of scrollLeft is negative, if the direction is right-to-left is true.
   */
  const handleNavPrev = useCallback((_, event) => {
    event.stopPropagation();

    const { clientWidth } = previewContrWrapperRef.current;
    const scrollLeft = convertScrollLeftOfElement(previewContrWrapperRef.current, isRtl);

    scroll(scrollLeft - (clientWidth * 0.5));
  }, [isRtl, scroll]);


  /**
   * Event handler for clicking the button to navigate the preview images to the next ones. Note
   * that the value of scrollLeft is negative, if the direction is right-to-left is true.
   */
  const handleNavNext = useCallback((_, event) => {
    event.stopPropagation();

    const { clientWidth } = previewContrWrapperRef.current;
    const scrollLeft = convertScrollLeftOfElement(previewContrWrapperRef.current, isRtl);

    scroll(scrollLeft + (clientWidth * 0.5));
  }, [isRtl, scroll]);


  /**
   * Event handler if a preview image becomes selected. So scroll the preview images in order that
   * the selected preview image is in the center of the view.
   */
  const handleReportPreviewImageWidth = useCallback((id, width) => {
    setImageWidths((prevValue) => ({
      ...prevValue,
      [id]: width,
    }));
  }, []);


  /**
   * Event handler for clicking on a preview image.
   */
  const handleClickPreviewImage = useCallback((id) => {
    onSelect(id);
  }, [onSelect]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    document.addEventListener('domChange', handleDomChange);

    return () => {
      document.removeEventListener('domChange', handleDomChange);
    };
  }, [handleDomChange]);


  // scroll the preview images to the selected image, if the selected ID or images changes or if the
  // window resizes
  useEffect(() => {
    window.addEventListener('resize', scrollToSelectedImage);
    scrollToSelectedImage();

    return () => {
      window.removeEventListener('resize', scrollToSelectedImage);
    };
  }, [scrollToSelectedImage]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const previewClasses = classNames(css.preview, {
    [css.isMobile]: isMobile,
  });

  const previewContrClasses = classNames(css.previewContr, {
    [css.center]: !enableScrollPrev && !enableScrollNext,
  });

  return (
    <div className={previewClasses}>
      {!isMobile && (
        <Button
          placeSelf={Enums.PlaceSelfItems.CENTER}
          visible={enableScrollPrev}
          type={ButtonType.ICON}
          darkTheme
          icon={isRtl ? 'NAVIRIGHT' : 'NAVILEFT'}
          onClick={handleNavPrev}
        />
      )}
      <div
        ref={previewContrWrapperRef}
        className={css.previewContrWrapper}
        {...scrollHandlersProps}
      >
        <div className={previewContrClasses}>
          {imageIds.map((id) => (
            <PreviewImage
              key={id}
              id={id}
              src={images[id]}
              isSelected={id === selectedId}
              onReportWidth={handleReportPreviewImageWidth}
              onClick={handleClickPreviewImage}
            />
          ))}
        </div>
      </div>
      {!isMobile && (
        <Button
          placeSelf={Enums.PlaceSelfItems.CENTER}
          visible={enableScrollNext}
          type={ButtonType.ICON}
          darkTheme
          icon={isRtl ? 'NAVILEFT' : 'NAVIRIGHT'}
          onClick={handleNavNext}
        />
      )}
    </div>
  );
  //                                                                                  </editor-fold>
};

Preview.displayName = 'Preview';

Preview.propTypes = {
  isRtl: PropTypes.bool,
  selectedId: PropTypes.string,
  images: PropTypes.object,
  isMobile: PropTypes.bool,
  onSelect: PropTypes.func,
};

Preview.defaultProps = {
  isRtl: false,
  selectedId: null,
  images: {},
  isMobile: false,
  onSelect() {},
};

export default Preview;
