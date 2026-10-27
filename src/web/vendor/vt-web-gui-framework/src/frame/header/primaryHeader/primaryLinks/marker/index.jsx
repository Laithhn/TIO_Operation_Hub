import PropTypes from 'prop-types';
import { memo, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';

import defines from 'assets/defines';
import { selectors } from 'store';
import classNames from 'utils/classNames';

import css from './marker.scss';


/**
 * Memoized React component of the marker for the active menu node in the primary section of the
 * header.
 */
const Marker = memo(({ id, posX, width }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const contentType = useSelector(selectors.mainScope.getContentType);
  const mainToolbarType = useSelector(selectors.mainScope.getMainToolbarType);

  const prevsRef = useRef({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const backgroundColor = (mainToolbarType !== 'NONE')
    ? defines.layout.mainToolbar.background
    : contentType.backgroundColor;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    prevsRef.current.id = id;
    prevsRef.current.width = width;
  }, [id, width]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const markerClasses = classNames(css.marker, {
    [css.enableAnimation]: !!prevsRef.current.width && (id !== prevsRef.current.id),
  });

  const markerStyle = {
    width: `${width}px`,
    backgroundColor,
    transform: `translateX(${posX}px)`,
  };

  return (
    <div className={markerClasses} style={markerStyle} />
  );
  //                                                                                  </editor-fold>
});

Marker.displayName = 'Marker';

Marker.propTypes = {
  id: PropTypes.string,
  posX: PropTypes.number,
  width: PropTypes.number,
};

Marker.defaultProps = {
  id: null,
  posX: 0,
  width: 0,
};

export default Marker;
