import PropTypes from 'prop-types';
import { memo, useRef, useEffect } from 'react';

import Enums from 'assets/enums';
import classNames from 'utils/classNames';

import css from './marker.scss';


const markerThickness = 2;


/**
 * Memoized React component of marker of the tab bar.
 */
const Marker = memo(({
  pos, offset, dim, animation, backgroundMarker, color,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const prevOffsetRef = useRef(Marker.defaultProps.offset);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isVertical = (pos === Enums.Position.LEFT) || (pos === Enums.Position.RIGHT);
  const enableAnimation = animation && (prevOffsetRef.current !== Marker.defaultProps.offset);
  const offsetPx = offset ? `${(offset ?? 0)}px` : 0;
  const dimPx = dim ? `${dim ?? 0}px` : 0;


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
    prevOffsetRef.current = offset;
  }, [offset]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const markerClasses = classNames(css.marker, {
    [css.enableAnimation]: enableAnimation,
    [css.isPosTop]: (pos === Enums.Position.TOP),
    [css.isPosBottom]: (pos === Enums.Position.BOTTOM),
    [css.isPosLeft]: (pos === Enums.Position.LEFT),
    [css.isPosRight]: (pos === Enums.Position.Right),
  });

  const markerStyle = {
    ...(isVertical ? {
      height: dimPx,
      width: backgroundMarker ? '100%' : `${markerThickness}px`,
      transform: `translateY(${offsetPx})`,
    } : {
      width: dimPx,
      height: backgroundMarker ? '100%' : `${markerThickness}px`,
      transform: `translateX(${offsetPx})`,
    }),
    background: color.color,
  };

  return (
    <div className={markerClasses} style={markerStyle} />
  );
  //                                                                                  </editor-fold>
});

Marker.displayName = 'Marker';

Marker.propTypes = {
  pos: PropTypes.instanceOf(Enums.Position),
  offset: PropTypes.number,
  dim: PropTypes.number,
  animation: PropTypes.bool,
  backgroundMarker: PropTypes.bool,
  color: PropTypes.oneOfType([PropTypes.instanceOf(Enums.MarkerColor), PropTypes.instanceOf(Enums.BackgroundColor)]).isRequired,
};

Marker.defaultProps = {
  pos: Enums.Position.TOP,
  offset: null,
  dim: null,
  animation: false,
  backgroundMarker: false,
};

export default Marker;
