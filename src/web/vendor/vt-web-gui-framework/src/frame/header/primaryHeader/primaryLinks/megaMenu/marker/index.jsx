import PropTypes from 'prop-types';
import { memo, useRef, useEffect } from 'react';

import classNames from 'utils/classNames';

import megaMenuDefines from '../defines';
import css from './marker.scss';


// Note that the following values for width and height must fit to the element marker.svg.
const svgWidth = megaMenuDefines.marker.width;
const svgHeight = megaMenuDefines.marker.height;
const svgViewBox = `0 0 ${svgWidth} ${svgHeight}`;

// All the folowing pathes are from file marker.svg. Note that for the animation the number and
// order of the points has to be the same for all pairs of pathes. Its easier to handle the pathes
// only with absolute values (letters in upper cases). You can set this in Inkscape at "Edit >
// Preferences... > Input/Output > SVG output > Path string format".
const backgroundStart = 'M50,8C44,8 39.5,6 36.5,4 33.5,2 30,0 25,0 20,0 16.5,2 13.5,4 10.5,6 6,8 0,8V24H50Z';
const backgroundEnd = 'M50,8C44,8 39.5,8 36.5,8 33.5,8 30,8 25,8 20,8 16.5,8 13.5,8 10.5,8 6,8 0,8V24H50Z';
const circleRadius = 4;
const circleCx = svgWidth / 2;
const circleCy = (svgHeight / 2) - circleRadius;
const circleTranslateValues = `0 0; 0 ${svgHeight / 2}; 0 0`;

// The number of key times has to be the same as the total number of pathes in attribute "values" of
// the animate elements. The number of key splines is one less than the number of key times. A key
// splines tester can be found here: https://franzheidl.github.io/keysplines/.
const keyTimes = '0;0.5;1';
const keySplines = '0.5 0 0.5 1; 0.5 0 0.9 1';


/**
 * Memoized React component of the animated marker of the mega menu.
 */
const Marker = memo(({ centerPosX, fadeIn, fadeOut }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const animateBackgroundRef = useRef();
  const animateCircleRef = useRef();

  const prevCenterPosYRef = useRef(0);

  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // show the marker if its position is larger than 0 and animate it only if it moves from one
  // visible position to another position
  const showMarker = !!centerPosX;
  const enableAnimation = showMarker && !!prevCenterPosYRef.current && (centerPosX !== prevCenterPosYRef.current);


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

  // effect to start the animations of the SVG elements, when the center position of the marker
  // changed
  useEffect(() => {
    if (enableAnimation) {
      animateBackgroundRef.current.beginElement();
      animateCircleRef.current.beginElement();
    }

    prevCenterPosYRef.current = centerPosX;
  }, [centerPosX, enableAnimation]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const markerClasses = classNames(css.marker, {
    [css.fadeIn]: showMarker && fadeIn,
    [css.fadeOut]: showMarker && fadeOut,
    [css.enableAnimation]: enableAnimation,
  });

  const markerStyle = {
    transform: `translateX(${centerPosX}px)`,
  };

  return (
    <span className={markerClasses} style={markerStyle}>
      <svg width={`${svgWidth}px`} height={`${svgHeight}px`} viewBox={svgViewBox}>
        <path className={css.background} d={backgroundStart}>
          <animate
            ref={animateBackgroundRef}
            attributeName="d"
            begin="indefinite"
            calcMode="spline"
            values={`${backgroundStart};${backgroundEnd};${backgroundStart}`}
            keyTimes={keyTimes}
            keySplines={keySplines}
            dur={`${megaMenuDefines.animationTimeMs}ms`}
          />
        </path>
        <circle className={css.circle} cx={circleCx} cy={circleCy} r={circleRadius}>
          <animateTransform
            ref={animateCircleRef}
            attributeName="transform"
            type="translate"
            begin="indefinite"
            calcMode="spline"
            values={circleTranslateValues}
            keyTimes={keyTimes}
            keySplines={keySplines}
            dur={`${megaMenuDefines.animationTimeMs}ms`}
          />
        </circle>
      </svg>
    </span>
  );
  //                                                                                  </editor-fold>
});

Marker.displayName = 'Marker';

Marker.propTypes = {
  centerPosX: PropTypes.number,
  fadeIn: PropTypes.bool,
  fadeOut: PropTypes.bool,
};

Marker.defaultProps = {
  centerPosX: null,
  fadeIn: false,
  fadeOut: false,
};

export default Marker;
