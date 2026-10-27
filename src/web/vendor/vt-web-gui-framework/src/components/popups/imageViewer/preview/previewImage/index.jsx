import PropTypes from 'prop-types';
import { memo, useState, useRef } from 'react';

import classNames from 'utils/classNames';

import css from './previewImage.scss';


/**
 *
 */
const PreviewImage = memo(({
  id, src, isSelected, onReportWidth, onClick,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [isLoaded, setIsLoaded] = useState(false);

  const ref = useRef();


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

  const handlePreviewImageLoaded = () => {
    setIsLoaded(true);
    onReportWidth(id, ref.current.offsetWidth);
  };


  /**
   *
   */
  const handlePointerUp = (event) => {
    event.stopPropagation();
    onClick(id);
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const previewImageClasses = classNames(css.previewImage, {
    [css.selected]: isLoaded && isSelected,
  });

  return (
    <span
      role="button"
      tabIndex={-1}
      ref={ref}
      className={previewImageClasses}
      onPointerUp={handlePointerUp}
      onKeyDown={null}
    >
      <img alt={id} src={src} onLoad={handlePreviewImageLoaded} />
    </span>
  );
  //                                                                                  </editor-fold>
});

PreviewImage.displayName = 'PreviewImage';

PreviewImage.propTypes = {
  id: PropTypes.string.isRequired,
  src: PropTypes.string,
  isSelected: PropTypes.bool,
  onReportWidth: PropTypes.func,
  onClick: PropTypes.func,
};

PreviewImage.defaultProps = {
  src: '',
  isSelected: false,
  onReportWidth() {},
  onClick() {},
};

export default PreviewImage;
