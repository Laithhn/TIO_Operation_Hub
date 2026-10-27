import PropTypes from 'prop-types';
import {
  useState, useRef, useCallback, useEffect,
} from 'react';


/**
 *
 */
const SizeMeasurer = ({
  className, style, disableWidth, disableHeight, children,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [isInit, setIsInit] = useState(false);
  const [clientWidth, setClientWidth] = useState(null);
  const [clientHeight, setClientHeight] = useState(null);

  const sizeMeasurerRef = useRef();


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

  /**
   *
   */
  const handleContrResize = useCallback(() => {
    if (!disableWidth) {
      setClientWidth(sizeMeasurerRef.current?.clientWidth ?? null);
    }

    if (!disableHeight) {
      setClientHeight(sizeMeasurerRef.current?.clientHeight ?? null);
    }
  }, [disableWidth, disableHeight]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    document.addEventListener('domChange', handleContrResize);
    handleContrResize();
    setIsInit(true);

    return () => {
      document.removeEventListener('domChange', handleContrResize);
    };
  }, [handleContrResize]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <div ref={sizeMeasurerRef} className={className} style={style}>
      {isInit && children({ clientWidth, clientHeight })}
    </div>
  );
  //                                                                                  </editor-fold>
};

SizeMeasurer.displayName = 'SizeMeasurer';

SizeMeasurer.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
  disableWidth: PropTypes.bool,
  disableHeight: PropTypes.bool,
  children: PropTypes.func,
};

SizeMeasurer.defaultProps = {
  className: '',
  style: {},
  disableWidth: false,
  disableHeight: false,
  children() {},
};

export default SizeMeasurer;
