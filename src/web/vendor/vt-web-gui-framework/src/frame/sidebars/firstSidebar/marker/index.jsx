import PropTypes from 'prop-types';
import { memo, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import { selectors } from 'store';

import firstSidebarDefines from '../defines';
import css from './marker.scss';


// Note that the following values for width and height must fit to the element marker.svg.
const svgWidth = firstSidebarDefines.marker.width;
const svgHeight = firstSidebarDefines.marker.height;
const svgViewBox = `0 0 ${svgWidth} ${svgHeight}`;

// All the folowing pathes are from file marker.svg. Note that for the animation the number and
// order of the points has to be the same for all pairs of pathes. Its easier to handle the pathes
// only with absolute values (letters in upper cases). You can set this in Inkscape at "Edit >
// Preferences... > Input/Output > SVG output > Path string format".
const backgroundStart = 'M11.5,0C11.5,6 8.36,9.767 6,13 3.64,16.233 0.5,20 0.5,25 0.5,30 3.546,33.874 6,37 8.454,40.126 11.5,44 11.5,50H12V0Z';
const backgroundEnd = 'M11.5,0C11.5,6 11.5,9 11.5,13 11.5,17 11.5,20 11.5,25 11.5,30 11.5,33 11.5,37 11.5,41 11.5,44 11.5,50H12V0Z';
const lineStart = 'M11.5,0C11.5,6 8.36,9.767 6,13 3.64,16.233 0.5,20 0.5,25 0.5,30 3.546,33.874 6,37 8.454,40.126 11.5,44 11.5,50';
const lineEnd = 'M11.5,0C11.5,6 11.5,9 11.5,13 11.5,17 11.5,20 11.5,25 11.5,30 11.5,33 11.5,37 11.5,41 11.5,44 11.5,50';
const circleRadius = 4;
const circleCx = (svgWidth / 2) - circleRadius;
const circleCy = svgHeight / 2;
const circleTranslateValues = `0 0; ${svgWidth / 2} 0; 0 0`;

// The number of key times has to be the same as the total number of pathes in attribute "values" of
// the animate elements. The number of key splines is one less than the number of key times. A key
// splines tester can be found here: https://franzheidl.github.io/keysplines/.
const keyTimes = '0;0.5;1';
const keySplines = '0.5 0 0.5 1; 0.5 0 0.9 1';

const markerTransition = `transform ${defines.system.contentChangeFadeOutTimeMs}ms ease-in-out`;


/**
 * Memoized React component of the animated marker of the first sidebar.
 */
const Marker = memo(({ centerPosY }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const contentType = useSelector(selectors.mainScope.getContentType);

  const animateBackgroundRef = useRef();
  const animateLineRef = useRef();
  const animateCircleRef = useRef();

  const prevCenterPosYRef = useRef(0);

  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // show the marker if its position is larger than 0 and animate it only if it moves from one
  // visible position to another position
  const showMarker = !!centerPosY;
  const enableAnimation = showMarker && !!prevCenterPosYRef.current && (centerPosY !== prevCenterPosYRef.current);

  const backgroundColor = (contentType === Enums.ContentType.DASHBOARD)
    ? defines.layout.dashboard.background
    : defines.layout.article.background;


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
      animateLineRef.current.beginElement();
      animateCircleRef.current.beginElement();
    }

    prevCenterPosYRef.current = centerPosY;
  }, [centerPosY, enableAnimation]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!showMarker) {
    return null;
  }

  const markerStyle = {
    transform: `translateY(${centerPosY}px)`,
    ...(enableAnimation && { transition: markerTransition }),
  };

  const backgroundStyle = {
    fill: backgroundColor,
  };

  return (
    <span className={css.marker} style={markerStyle}>
      <svg width={`${svgWidth}px`} height={`${svgHeight}px`} viewBox={svgViewBox}>
        <path style={backgroundStyle} d={backgroundStart}>
          <animate
            ref={animateBackgroundRef}
            attributeName="d"
            begin="indefinite"
            calcMode="spline"
            values={`${backgroundStart};${backgroundEnd};${backgroundStart}`}
            keyTimes={keyTimes}
            keySplines={keySplines}
            dur={`${defines.system.contentChangeFadeOutTimeMs}ms`}
          />
        </path>
        <path className={css.line} d={lineStart}>
          <animate
            ref={animateLineRef}
            attributeName="d"
            begin="indefinite"
            calcMode="spline"
            values={`${lineStart};${lineEnd};${lineStart}`}
            keyTimes={keyTimes}
            keySplines={keySplines}
            dur={`${defines.system.contentChangeFadeOutTimeMs}ms`}
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
            dur={`${defines.system.contentChangeFadeOutTimeMs}ms`}
          />
        </circle>
      </svg>
    </span>
  );
  //                                                                                  </editor-fold>
});

Marker.displayName = 'Marker';

Marker.propTypes = {
  centerPosY: PropTypes.number,
};

Marker.defaultProps = {
  centerPosY: null,
};

export default Marker;
