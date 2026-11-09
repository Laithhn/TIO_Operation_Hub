import { useContext } from 'react';

import { Button, type ButtonProps, ButtonStatus } from 'components/controls/button';
import { SelectBox, type SelectBoxProps } from 'components/controls/selectBox';
import { classNames } from 'utils/classNames';
import { round } from 'utils/math';

import { ImageDataContext } from '../imageData.context';
import {
  selectFittingZoomById, selectHeightById, selectIsZoomEnabled, selectWidthById, selectZoomById,
  selectZoomStepsById, setZoom, zoomFit, zoomInOut,
} from '../imageData.reducer';

import * as css from './header.scss';
import type { HeaderProps } from './header.types';


/**
 * Helper function to write a zoom value the way the viewer computed it. The fitting zoom is no
 * round number, so it keeps as many decimals as its size asks for: the smaller it is, the more of
 * them tell one step from the next.
 */
const getZoomText = (zoom: number): string => {
  if (zoom < 1) {
    return String(round(zoom, 3));
  }
  if (zoom < 10) {
    return String(round(zoom, 2));
  }
  if (zoom < 100) {
    return String(round(zoom, 1));
  }

  return String(round(zoom, 0));
};


/**
 * React sub-component "Header" of the popup component "ImageViewer": the row above the image,
 * carrying the title, the line about the shown image, and the controls for zoom, for opening the
 * image in a tab of its own, for expanding it and for closing the viewer.
 */
const Header = ({
  title = '', subtitle = '', showDimensions = false, numImages = 0, imageId = null, imageIdx = -1,
  isMobile = false, isExpanded = false, onToggleExpand, onOpenImage, onClose,
}: HeaderProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { imageDataState, imageDataDispatch } = useContext(ImageDataContext);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // An ID naming no image finds no measurements, which is what an empty one stands for here: the
  // header is there before any image is.
  const shownImageId = imageId ?? '';
  const width = selectWidthById(imageDataState, shownImageId);
  const height = selectHeightById(imageDataState, shownImageId);
  const isZoomEnabled = selectIsZoomEnabled(imageDataState, shownImageId);
  const zoomSteps = selectZoomStepsById(imageDataState, shownImageId);
  const fittingZoom = selectFittingZoomById(imageDataState, shownImageId);
  const zoom = selectZoomById(imageDataState, shownImageId);

  const isSubtitle = ((typeof subtitle === 'number') || (subtitle !== ''));
  // The ID of an image arrives at once, its measurements only with the image's "onLoad": the size
  // is therefore left out until it is known, rather than standing there as "null x null".
  const isDimensions = (showDimensions && (width !== null) && (height !== null));
  const isMobileOrExpanded = (isMobile || isExpanded);
  // The counter stands beside a subtitle in brackets and alone without one, and it is left out
  // where there is nothing to count through.
  const counter = ((numImages > 1) && (imageIdx >= 0))
    ? `${isSubtitle ? '(' : ''}${imageIdx + 1}/${numImages}${isSubtitle ? ')' : ''}`
    : '';

  // The zoom values as the select box shows them: the fitting one in italics, the fixed steps as
  // they are. A text is a string here, where the values themselves stay numbers.
  const zoomOptions: NonNullable<SelectBoxProps<number>['options']> = (zoomSteps ?? []).map((step) => (
    (step === fittingZoom)
      ? { value: step, text: getZoomText(step), isItalic: true }
      : { value: step, text: String(step) }
  ));
  const smallestZoom = zoomOptions[0]?.value;
  const largestZoom = zoomOptions[zoomOptions.length - 1]?.value;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the callback prop "onSelect" of the zoom select box.
   */
  const handleSelectZoom: NonNullable<SelectBoxProps<number>['onSelect']> = ({ value }) => {
    if ((imageId !== null) && (value !== null)) {
      imageDataDispatch(setZoom(imageId, value));
    }
  };


  /**
   * Handler for the callback prop "onClick" of the button that fits the image into the viewer.
   */
  const handleClickZoomFit: NonNullable<ButtonProps['onClick']> = ({ event }) => {
    event.stopPropagation();

    if (imageId !== null) {
      imageDataDispatch(zoomFit(imageId));
    }
  };


  /**
   * Handler for the callback prop "onClick" of the button that zooms out of the image.
   */
  const handleClickZoomOut: NonNullable<ButtonProps['onClick']> = ({ event }) => {
    event.stopPropagation();

    if (imageId !== null) {
      imageDataDispatch(zoomInOut(imageId, -1));
    }
  };


  /**
   * Handler for the callback prop "onClick" of the button that zooms into the image.
   */
  const handleClickZoomIn: NonNullable<ButtonProps['onClick']> = ({ event }) => {
    event.stopPropagation();

    if (imageId !== null) {
      imageDataDispatch(zoomInOut(imageId, 1));
    }
  };


  /**
   * Handler for the callback prop "onClick" of the button that expands or shrinks the image. The
   * event stops here, as it does at every button of the header: the viewer behind them answers a
   * click of its own.
   */
  const handleToggleExpand: NonNullable<ButtonProps['onClick']> = ({ event }) => {
    event.stopPropagation();
    onToggleExpand?.();
  };


  /**
   * Handler for the callback prop "onClick" of the button that opens the image in a tab of its own.
   */
  const handleOpenImage: NonNullable<ButtonProps['onClick']> = ({ event }) => {
    event.stopPropagation();
    onOpenImage?.();
  };


  /**
   * Handler for the callback prop "onClick" of the button that closes the viewer.
   */
  const handleClose: NonNullable<ButtonProps['onClick']> = ({ event }) => {
    event.stopPropagation();
    onClose?.({ event });
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const headerClasses = classNames(css.header, {
    [css.isExpanded]: isMobileOrExpanded,
  });

  return (
    <div className={headerClasses}>
      <div>
        <div className={css.title}>{title}</div>
        <div className={css.subtitle}>
          {isSubtitle && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
            <span>{subtitle}</span>
          )}
          {isDimensions && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
            <span>{`${width} x ${height}`}</span>
          )}
          {!!counter && <span>{counter}</span>}
        </div>
      </div>
      <div className={css.controlsCntr}>
        {isZoomEnabled && !isMobile && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
          <div className={css.controlsSubCntr}>
            <SelectBox<number>
              limitMenu={5}
              noSelection
              options={zoomOptions}
              value={zoom ?? fittingZoom}
              onSelect={handleSelectZoom}
            />
            <Button
              type="bare"
              large={!isExpanded}
              status={(!zoom || (zoom === fittingZoom)) ? ButtonStatus.DISABLED : ButtonStatus.IDLE}
              icon="ZOOMFIT"
              onClick={handleClickZoomFit}
            />
            <Button
              type="bare"
              large={!isExpanded}
              status={(zoom === smallestZoom) ? ButtonStatus.DISABLED : ButtonStatus.IDLE}
              icon="ZOOMOUT"
              onClick={handleClickZoomOut}
            />
            <Button
              type="bare"
              large={!isExpanded}
              status={(zoom === largestZoom) ? ButtonStatus.DISABLED : ButtonStatus.IDLE}
              icon="ZOOMIN"
              onClick={handleClickZoomIn}
            />
          </div>
        )}
        <div className={css.controlsSubCntr}>
          <Button
            type="bare"
            large={!isMobileOrExpanded}
            icon="WINDOWUNMAXIMIZE"
            onClick={handleOpenImage}
          />
          <Button
            type="bare"
            large={!isMobileOrExpanded}
            icon={isExpanded ? 'SHRINK' : 'EXPAND'}
            onClick={handleToggleExpand}
          />
        </div>
        <Button
          justifySelf="center"
          type="bare"
          large={!isMobileOrExpanded}
          icon="WINDOWCLOSE"
          onClick={handleClose}
        />
      </div>
    </div>
  );
  //                                                                                  </editor-fold>
};

Header.displayName = 'Header';


export { Header };
