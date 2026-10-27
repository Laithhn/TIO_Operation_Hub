import PropTypes from 'prop-types';
import { useMemo, useContext, useCallback } from 'react';

import Enums from 'assets/enums';
import Button, { ButtonType, ButtonState } from 'components/controls/button';
import SelectBox from 'components/controls/selectBox';
import classNames from 'utils/classNames';
import { round } from 'utils/math';

import { ImageDataContext, actions as imageDataActions, selectors as imageDataSelectors } from '../imageDataReducer';
import css from './header.scss';


/**
 * React component of the header section of the image viewer.
 */
const Header = ({
  title, subtitle, showDimensions, numImages, imageId, imageIdx, isMobile, isExpanded,
  onToggleExpand, onOpenImage, onClose,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { imageDataState, imageDataDispatch } = useContext(ImageDataContext);
  const width = imageDataSelectors.getWidthById(imageDataState, imageId);
  const height = imageDataSelectors.getHeightById(imageDataState, imageId);
  const isZoomEnabled = imageDataSelectors.isZoomEnabled(imageDataState, imageId);
  const zoomSteps = imageDataSelectors.getZoomStepsById(imageDataState, imageId);
  const fittingZoom = imageDataSelectors.getFittingZoomById(imageDataState, imageId);
  const zoom = imageDataSelectors.getZoomById(imageDataState, imageId);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isSubtitle = (typeof subtitle === 'number') || (subtitle !== '');
  const isMobileOrExpanded = isMobile || isExpanded;
  let counter;

  if ((numImages > 1) && (imageIdx >= 0)) {
    counter = isSubtitle ? `(${imageIdx + 1}/${numImages})` : `${imageIdx + 1}/${numImages}`;
  }


  const zoomOptions = useMemo(() => (zoomSteps ?? []).reduce((acc, val) => {
    let text, italic;

    if (val === fittingZoom) {
      if (val < 1) {
        text = round(val, 3);
      } else if (val < 10) {
        text = round(val, 2);
      } else if (val < 100) {
        text = round(val, 1);
      } else {
        text = Math.round(val);
      }
      italic = true;
    } else {
      text = val;
      italic = false;
    }

    return [
      ...acc,
      { value: val, text, italic },
    ];
  }, []), [zoomSteps, fittingZoom]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const handleSelectZoom = useCallback((value) => {
    imageDataDispatch(imageDataActions.setZoom(imageId, value));
  }, [imageId, imageDataDispatch]);


  /**
   *
   */
  const handleClickZoom = useCallback((id) => {
    switch (id) {
      case 'zoomFit':
        imageDataDispatch(imageDataActions.zoomFit(imageId));
        break;

      case 'zoomOut':
        imageDataDispatch(imageDataActions.zoomInOut(imageId, -1));
        break;

      case 'zoomIn': {
        imageDataDispatch(imageDataActions.zoomInOut(imageId, 1));
        break;
      }

      // no default
    }
  }, [imageId, imageDataDispatch]);


  /**
   *
   */
  const handleToggleExpand = useCallback((_, event) => {
    event.stopPropagation();
    onToggleExpand();
  }, [onToggleExpand]);


  /**
   *
   */
  const handleOpenImage = useCallback((_, event) => {
    event.stopPropagation();
    onOpenImage();
  }, [onOpenImage]);


  /**
   *
   */
  const handleClose = useCallback((_, event) => {
    event.stopPropagation();
    onClose();
  }, [onClose]);


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
          {isSubtitle && (<span>{subtitle}</span>)}
          {showDimensions && (<span>{`${width} x ${height}`}</span>)}
          {counter && (<span>{counter}</span>)}
        </div>
      </div>
      <div className={css.controlsCntr}>
        {isZoomEnabled && !isMobile && (
          <div className={css.controlsSubCntr}>
            <SelectBox
              darkTheme
              limitMenu={5}
              noSelection
              options={zoomOptions}
              value={zoom ?? fittingZoom}
              onSelect={handleSelectZoom}
            />
            <Button
              id="zoomFit"
              type={ButtonType.ICON}
              large={!isExpanded}
              state={(!zoom || (zoom === fittingZoom)) ? ButtonState.DISABLED : ButtonState.IDLE}
              darkTheme
              icon="ZOOMFIT"
              onClick={handleClickZoom}
            />
            <Button
              id="zoomOut"
              type={ButtonType.ICON}
              large={!isExpanded}
              state={(zoom === zoomOptions[0].value) ? ButtonState.DISABLED : ButtonState.IDLE}
              darkTheme
              icon="ZOOMOUT"
              onClick={handleClickZoom}
            />
            <Button
              id="zoomIn"
              type={ButtonType.ICON}
              large={!isExpanded}
              darkTheme
              state={(zoom === zoomOptions[zoomOptions.length - 1].value) ? ButtonState.DISABLED : ButtonState.IDLE}
              icon="ZOOMIN"
              onClick={handleClickZoom}
            />
          </div>
        )}
        <div className={css.controlsSubCntr}>
          <Button
            type={ButtonType.ICON}
            large={!isMobileOrExpanded}
            darkTheme
            icon="WINDOWUNMAXIMIZE"
            onClick={handleOpenImage}
          />
          <Button
            type={ButtonType.ICON}
            large={!isMobileOrExpanded}
            darkTheme
            icon={isExpanded ? 'SHRINK' : 'EXPAND'}
            onClick={handleToggleExpand}
          />
        </div>
        <Button
          justifySelf={Enums.PlaceSelfItems.CENTER}
          type={ButtonType.ICON}
          large={!isMobileOrExpanded}
          darkTheme
          icon="WINDOWCLOSE"
          onClick={handleClose}
        />
      </div>
    </div>
  );
  //                                                                                  </editor-fold>
};

Header.displayName = 'Header';

Header.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  showDimensions: PropTypes.bool,
  numImages: PropTypes.number,
  imageId: PropTypes.string,
  imageIdx: PropTypes.number,
  isMobile: PropTypes.bool,
  isExpanded: PropTypes.bool,
  onToggleExpand: PropTypes.func,
  onOpenImage: PropTypes.func,
  onClose: PropTypes.func,
};

Header.defaultProps = {
  title: '',
  subtitle: '',
  showDimensions: false,
  numImages: 0,
  imageId: null,
  imageIdx: -1,
  isMobile: false,
  isExpanded: false,
  onToggleExpand() {},
  onOpenImage() {},
  onClose() {},
};

export default Header;
