import {
  useCallback, useLayoutEffect, useMemo, useRef, useState,
} from 'react';

import { ScrollButton, type ScrollButtonProps } from 'components/helpers/scrollButton';
import { useDimensions } from 'components/hooks/useDimensions';
import { useI18n } from 'components/hooks/useI18n';
import { useScrollHandlers, type UseScrollHandlersProps } from 'components/hooks/useScrollHandlers';
import { classNames } from 'utils/classNames';
import { convertScrollLeftOfElement, scrollLeftDiff, scrollLeftTo } from 'utils/scroll';

import * as cssImageViewer from '../imageViewer.scss';
import type { ImageViewerImageId } from '../imageViewer.types';

import * as css from './preview.scss';
import type { PreviewProps } from './preview.types';
import { PreviewImage } from './previewImage/PreviewImage';
import * as cssPreviewImage from './previewImage/previewImage.scss';


// A stylesheet exports its values as strings, so they are turned into numbers once, here where they
// are counted with.
const imageChangeTransitionTimeMs = Number(cssImageViewer.imageChangeTransitionTimeMs);
const previewImagesColumnGap = Number(cssPreviewImage.previewImagesColumnGap);
const previewImagesBorderWidth = Number(cssPreviewImage.previewImagesBorderWidth);

/** The strip without images, as one object rather than a literal in the default of the prop: a
 * literal is a new object on every render and would pull every render after it. */
const noImages: Record<ImageViewerImageId, string> = {};


/**
 * React sub-component "Preview" of the popup component "ImageViewer": the strip of thumbnails below
 * the shown image. It keeps the thumbnail of that image in its middle and scrolls by wheel, by
 * touch and, away from a mobile device, by a scroll button at either end.
 */
const Preview = ({
  selectedId = null, images = noImages, isMobile = false, onSelect,
}: PreviewProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = useI18n();

  const [imageWidths, setImageWidths] = useState<Record<ImageViewerImageId, number>>({});
  const [showScrollButtonStart, setShowScrollButtonStart] = useState(false);
  const [showScrollButtonEnd, setShowScrollButtonEnd] = useState(false);

  const stripElemRef = useRef<HTMLDivElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // It keeps its useMemo: a function an effect lists in its dependencies depends on it, and
  // react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
  // along that chain.
  const imageIds = useMemo(() => Object.keys(images), [images]);
  const { clientWidth, scrollWidth } = useDimensions({ ref: stripElemRef });
  const dimVisible = clientWidth ?? 0;
  const dimTotal = scrollWidth ?? 0;
  const isOverflow = (dimTotal > dimVisible);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to read the scroll offset of the strip, normalized to start
   * at zero in either text direction.
   *
   * It keeps its useCallback: a function an effect lists in its dependencies depends on it, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * along that chain.
   */
  const getScrollOffset = useCallback((): number => (
    stripElemRef.current ? convertScrollLeftOfElement(stripElemRef.current, isRtl) : 0
  ), [isRtl]);


  /**
   * Helper function to show each scroll button exactly while there is something
   * to scroll to in its direction.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const setVisibilityScrollButtons = useCallback(() => {
    const scrollOffset = getScrollOffset();

    setShowScrollButtonStart(isOverflow && (scrollOffset > 0));
    setShowScrollButtonEnd(isOverflow && (scrollOffset < (dimTotal - dimVisible)));
  }, [getScrollOffset, isOverflow, dimTotal, dimVisible]);


  /**
   * Helper function to scroll the strip to an absolute offset, eased, with the
   * scroll buttons following the movement.
   *
   * It keeps its useCallback: a function an effect lists in its dependencies depends on it, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * along that chain.
   */
  const scrollTo = useCallback((to: number) => {
    if (stripElemRef.current) {
      scrollLeftTo(stripElemRef.current, to, {
        isRtl,
        duration: imageChangeTransitionTimeMs,
        easing: 'easeInOutQuad',
        callback: setVisibilityScrollButtons,
      });
    }
  }, [isRtl, setVisibilityScrollButtons]);


  /**
   * Helper function to bring the thumbnail of the shown image into the middle of
   * the strip. Its place is added up from the widths the thumbnails report as they load: they
   * differ per image, and the strip learns them from its children rather than measuring each itself.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const scrollToSelectedImage = useCallback(() => {
    if (selectedId === null) {
      return;
    }

    const selectedWidth = imageWidths[selectedId] ?? (previewImagesBorderWidth * 2);
    let offsetOfSelected = 0;

    for (const id of imageIds) {
      if (id === selectedId) {
        break;
      }

      offsetOfSelected += (imageWidths[id] ?? 0) + previewImagesColumnGap;
    }

    scrollTo(offsetOfSelected - ((dimVisible - selectedWidth) / 2));
  }, [selectedId, imageWidths, imageIds, dimVisible, scrollTo]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the callback prop of the hook "useScrollHandlers": scrolling by wheel or by touch.
   */
  const handleChangeScroll: NonNullable<UseScrollHandlersProps<HTMLDivElement>['onChangeX']> = ({ diff }) => {
    if (stripElemRef.current) {
      scrollLeftDiff(stripElemRef.current, diff, { isRtl, callback: setVisibilityScrollButtons });
    }
  };


  // The whole set is claimed only while the thumbnails do not fit: the hook stops the propagation of
  // every wheel and touch event it takes, so a strip with nothing to scroll would swallow the
  // gesture and leave the viewer around it standing still.
  const scrollHandlersProps = useScrollHandlers<HTMLDivElement>({
    ...(isOverflow && {
      enableWheel: true,
      enableTouch: true,
      onChangeX: handleChangeScroll,
    }),
  });


  /**
   * Handler for the callback prop "onClick" of the two scroll buttons: each click moves the strip
   * by half of what it shows.
   */
  const handleClickScrollButton: ScrollButtonProps['onClick'] = ({ dir }) => {
    const forwards = (dir === 'right');

    scrollTo(getScrollOffset() + ((forwards ? 0.5 : -0.5) * dimVisible));
  };


  /**
   * Handler for the callback prop "onReportWidth" of a thumbnail.
   */
  const handleReportWidth = ({ id, width }: { id: ImageViewerImageId; width: number }) => {
    setImageWidths((prevWidths) => (
      (prevWidths[id] === width) ? prevWidths : { ...prevWidths, [id]: width }
    ));
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // Brings the selected thumbnail into the middle of the strip, and runs again whenever something
  // can have moved it: the selection, a thumbnail that has just reported its width, or the space the
  // strip has. The place comes from those measurements, so it is taken once the layout stands.
  //
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(scrollToSelectedImage);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [scrollToSelectedImage]);


  // The scroll buttons follow the strip's size and its content's; the scrolling itself keeps them up
  // to date through its callback.
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(setVisibilityScrollButtons);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [setVisibilityScrollButtons]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const previewContrClasses = classNames(css.previewContr, {
    // A strip whose thumbnails all fit centres them instead of letting them start at its edge.
    [css.center]: !isOverflow,
  });

  return (
    <div className={css.preview}>
      <div
        ref={stripElemRef}
        className={css.previewContrWrapper}
        // The strip is also scrolled by the browser itself: tabbing to a thumbnail outside the
        // visible part brings it into view. The scroll buttons would otherwise keep the visibility
        // of a position the strip has left.
        onScroll={setVisibilityScrollButtons}
        {...scrollHandlersProps}
      >
        <div className={previewContrClasses}>
          {imageIds.map((id) => (
            <PreviewImage
              key={id}
              id={id}
              src={images[id] ?? ''}
              isSelected={id === selectedId}
              onReportWidth={handleReportWidth}
              {...(onSelect && { onClick: onSelect })}
            />
          ))}
        </div>
      </div>
      {!isMobile && (
        <ScrollButton
          dir="left"
          pos="center"
          show={showScrollButtonStart}
          showShader
          holdable
          onClick={handleClickScrollButton}
        />
      )}
      {!isMobile && (
        <ScrollButton
          dir="right"
          pos="center"
          show={showScrollButtonEnd}
          showShader
          holdable
          onClick={handleClickScrollButton}
        />
      )}
    </div>
  );
  //                                                                                  </editor-fold>
};

Preview.displayName = 'Preview';


export { Preview };
