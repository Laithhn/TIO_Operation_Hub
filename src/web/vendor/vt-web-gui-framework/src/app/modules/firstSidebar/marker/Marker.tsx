import {
  useEffect, useId, useRef, useState,
} from 'react';

import * as mainScopeSlice from 'app/modules/mainScope/mainScope.slice';
import { color, layout } from 'assets/styles';
import { useSelector } from 'components/hooks/useSelector';

import * as css from './marker.scss';
import type { MarkerProps } from './marker.types';


// Note that the following values for width and height must fit to the element marker.svg.
const svgWidth = layout.firstSidebar.markerWidth;
const svgHeight = layout.firstSidebar.markerHeight;
const svgViewBox = `0 0 ${svgWidth} ${svgHeight}`;
const svgCenterPosY = svgHeight / 2;

// The two pathes of the dent are from file marker.svg. Note that for the animation the number and
// order of the points has to be the same for both pairs of pathes. Its easier to handle the pathes
// only with absolute values (letters in upper cases). You can set this in Inkscape at "Edit >
// Preferences... > Input/Output > SVG output > Path string format".
const backgroundStart = 'M11.5,0C11.5,6 8.36,9.767 6,13 3.64,16.233 0.5,20 0.5,25 0.5,30 3.546,33.874 6,37 8.454,40.126 11.5,44 11.5,50H12V0Z';
const backgroundEnd = 'M11.5,0C11.5,6 11.5,9 11.5,13 11.5,17 11.5,20 11.5,25 11.5,30 11.5,33 11.5,37 11.5,41 11.5,44 11.5,50H12V0Z';
const lineStart = 'M11.5,0C11.5,6 8.36,9.767 6,13 3.64,16.233 0.5,20 0.5,25 0.5,30 3.546,33.874 6,37 8.454,40.126 11.5,44 11.5,50';
const lineEnd = 'M11.5,0C11.5,6 11.5,9 11.5,13 11.5,17 11.5,20 11.5,25 11.5,30 11.5,33 11.5,37 11.5,41 11.5,44 11.5,50';

// The drop that marks the active menu node. It rests in the dent and travels out to the flat right
// edge and back while the dent smoothes itself. Its far position is as far right as the body still
// fits the viewBox: what leaves it is cut off, the menu around the marker clipping at exactly that
// edge (see menu.scss).
//
// **The drop keeps its round shape the whole way.** It was built to stretch into a body of liquid
// being pulled along while it travels, the way the header's lens does - the travel turned out to be
// far too short and quick to see any of it (ADR PDWG-106-sidebar-marker-is-a-glass-drop.md).
const dropRadius = 5;
const dropRestPosX = 9;
const dropTravelPosX = svgWidth - dropRadius;
const dropTranslateValues = `0 0; ${dropTravelPosX - dropRestPosX} 0; 0 0`;

// The number of key times has to be the same as the total number of values of an animate element.
// The number of key splines is one less than the number of key times. A key splines tester can be
// found here: https://franzheidl.github.io/keysplines/.
const keyTimes = '0;0.5;1';
const keySplines = '0.5 0 0.5 1; 0.5 0 0.9 1';

const markerTransition = `transform ${layout.animationTime.contentFadeOutMs}ms ease-in-out`;


/**
 * React sub-component of the animated marker of the of the app module "FirstSidebar".
 *
 * The marker dents the right edge of the sidebar at the active menu node and carries a drop in that
 * dent. The drop is a **glass body** - a translucent pane with an edge, a lit rim, an inner glow
 * and a contact shadow around it, the light of the base design that the header's menu marker is
 * made of as well. While the marker moves from one node to another, the dent smoothes itself and
 * the drop travels out to the flat edge and back.
 */
const Marker = ({ centerPosY }: MarkerProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const contentType = useSelector(mainScopeSlice.selectContentType);

  const [prevCenterPosY, setPrevCenterPosY] = useState<MarkerProps['centerPosY']>(0);

  // The clip path and the filters inside the element are referenced by "url(#…)", so their ids
  // have to be unique per instance and safe inside a fragment reference: useId() answers the first
  // and states no format for what it returns - React 19 wraps its ids in guillemets - so everything
  // but the characters a reference takes without a thought is dropped.
  const elemId = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  const animateBackgroundRef = useRef<SVGAnimationElement>(null);
  const animateLineRef = useRef<SVGAnimationElement>(null);
  const animateDropRef = useRef<SVGAnimationElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // show the marker if its position is larger than 0 and animate it only if it moves from one
  // visible position to another position
  const showMarker = !!centerPosY;
  const enableAnimation = showMarker && !!prevCenterPosY && (centerPosY !== prevCenterPosY);

  // The position is taken over in the next frame, not in this render and not in an effect. Taking
  // it over here would clear enableAnimation again in the same pass, because a state set during
  // render discards that render - and the one render carrying it is what starts the transition and
  // the SVG animations. An effect that sets a state is a cascading render, which is what the React
  // Compiler's rule "set-state-in-effect" is about. The header's menu marker solves the same
  // problem the same way (see its Marker.tsx).
  if (centerPosY !== prevCenterPosY) {
    requestAnimationFrame(() => {
      setPrevCenterPosY(centerPosY);
    });
  }

  const backgroundColor = color[(contentType === 'dashboard')
    ? layout.content.dashboardBackground
    : layout.content.articleBackground];


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
      animateBackgroundRef.current?.beginElement();
      animateLineRef.current?.beginElement();
      animateDropRef.current?.beginElement();
    }
  }, [enableAnimation]);


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

  // The two lights of the glass are the drop's own outline drawn a second and a third time and cut
  // to the drop: the rim one pixel lower, which leaves the bright line along the top edge, and the
  // glow as a wide blurred stroke, of which only the inner half survives the cut. On a box both are
  // inset shadows; a circle knows none.
  //
  // The three of them travel together in one group, so that one animation moves the whole body. The
  // clip path is resolved in the user space of the element that references it, which lies inside
  // that group - so it travels with them and needs no animation of its own.
  //
  // The contact shadow and the blur of the glow are filters of the SVG, not CSS filters: Safari
  // applies no CSS filter to an element inside an SVG. Their region reaches a body's width beyond
  // it on every side, where the default of ten percent would cut the shadow off, and they work in
  // sRGB, the space of a CSS filter, where an SVG filter would work in linearRGB. The colour of the
  // shadow is set in marker.scss.
  return (
    <span className={css.marker} style={markerStyle}>
      <svg width={`${svgWidth}px`} height={`${svgHeight}px`} viewBox={svgViewBox}>
        <defs>
          <clipPath id={`${elemId}-dropClip`}>
            <circle cx={dropRestPosX} cy={svgCenterPosY} r={dropRadius} />
          </clipPath>
          <filter
            id={`${elemId}-dropShadow`}
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
            colorInterpolationFilters="sRGB"
          >
            <feDropShadow
              className={css.dropShadow}
              dx="0"
              dy="1"
              stdDeviation="3"
            />
          </filter>
          <filter
            id={`${elemId}-dropGlowBlur`}
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="1" />
          </filter>
        </defs>
        <path style={backgroundStyle} d={backgroundStart}>
          <animate
            ref={animateBackgroundRef}
            attributeName="d"
            begin="indefinite"
            calcMode="spline"
            values={`${backgroundStart};${backgroundEnd};${backgroundStart}`}
            keyTimes={keyTimes}
            keySplines={keySplines}
            dur={`${layout.animationTime.contentFadeOutMs}ms`}
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
            dur={`${layout.animationTime.contentFadeOutMs}ms`}
          />
        </path>
        <g>
          <animateTransform
            ref={animateDropRef}
            attributeName="transform"
            type="translate"
            begin="indefinite"
            calcMode="spline"
            values={dropTranslateValues}
            keyTimes={keyTimes}
            keySplines={keySplines}
            dur={`${layout.animationTime.contentFadeOutMs}ms`}
          />
          <circle
            className={css.drop}
            cx={dropRestPosX}
            cy={svgCenterPosY}
            r={dropRadius}
            filter={`url(#${elemId}-dropShadow)`}
          />
          <g clipPath={`url(#${elemId}-dropClip)`}>
            <circle
              className={css.dropGlow}
              cx={dropRestPosX}
              cy={svgCenterPosY}
              r={dropRadius}
              filter={`url(#${elemId}-dropGlowBlur)`}
            />
            <circle
              className={css.dropRim}
              cx={dropRestPosX}
              cy={svgCenterPosY}
              r={dropRadius}
              transform="translate(0 1)"
            />
          </g>
        </g>
      </svg>
    </span>
  );
  //                                                                                  </editor-fold>
};

Marker.displayName = 'Marker';


export { Marker };
