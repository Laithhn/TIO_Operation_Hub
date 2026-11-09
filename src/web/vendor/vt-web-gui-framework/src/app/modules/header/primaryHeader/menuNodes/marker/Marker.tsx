import {
  useEffect, useId, useRef, useState,
} from 'react';

import { layout } from 'assets/styles';
import { classNames } from 'utils/classNames';

import * as css from './marker.scss';
import type { MarkerProps } from './marker.types';


// The lens at rest: the height every control of the framework carries, centred in the header. Its
// two caps are half circles of half that height, which is the radius the base design gives a body
// of this size anyway - a pill (controls.borderRadiusDefault is that same 15).
const shapeHeight = layout.controls.heightDefault;
const shapeTop = (layout.header.height - shapeHeight) / 2;

// The two springs the lens is made of, one per edge, and their difference is the whole effect: the
// edge that leads a movement is stiffer than the one that trails it, so the body stretches while it
// travels and gathers itself again when it arrives. Both are damped just under the critical value
// (2 * sqrt(k)), which lets the shape overshoot by a hair instead of creeping to a stop.
const stiffnessLeading = 260;
const stiffnessTrailing = 190;
const damping = 26;

// What counts as standing still: a tenth of a pixel of distance and of travel per second. Below
// both the loop snaps the edges onto their targets and stops, so a resting marker costs no frames.
const restDistancePx = 0.1;
const restSpeedPxPerS = 0.1;

// The frame time is clamped before it enters the integration: a tab in the background hands out one
// step of several hundred milliseconds when it returns, and an unclamped spring explodes on it.
const maxStepS = 1 / 30;

// What the body does with the length it gains, and it is the shape of a drop that is pulled along:
// **the mass sits at the front**, the end that takes the acceleration, and it keeps nearly its full
// height. **The trailing end is a smaller, still round ball** that is dragged after it. **Between
// them the material is drawn thin** - a neck that forms behind the trailing ball and closes again
// the moment the body stops.
//
// The three are separate on purpose: the ends stay round whatever happens, and the thinning lives
// in the middle alone, where a stretched material actually thins.
const speedForFullEffectPxPerS = 1600;
const maxStretch = 1.35;
const leadShrink = 0.08;
const trailShrink = 0.4;
const waistPull = 0.55;
// Where the neck sits along the body: the control points of the two long edges, as a share of the
// distance between the two ends. The one at the trailing end is the nearer of the two, which pulls
// the narrowest place behind the ball rather than into the middle.
const waistFromTrailing = 0.25;
const waistFromLeading = 0.55;

// The light the body catches while it travels. It lags behind the movement - a highlight sits where
// the light falls, not where the body is going - and it fades out at a standstill, where the lens
// is to look exactly like the box it is without the effect.
const gleamWidth = 22;
const gleamMaxOpacity = 0.5;
const gleamLagShare = 0.38;


/**
 * Builds the path of the lens: a round cap at either end, joined by two long edges that bow towards
 * the centre line. The two caps carry their own height, which is what makes one end the mass and
 * the other the ball being dragged; the bow is the neck between them.
 *
 * At rest all three heights are the height of a control, and the path degenerates into exactly the
 * pill the lens is: the caps become half circles of the resting radius, and the two edges run
 * straight, their control points lying on the line they connect.
 */
const buildLensPath = ({
  start, end, centreY, heightLeft, heightRight, heightWaist, bowLeft, bowRight,
}: {
  start: number; end: number; centreY: number; heightLeft: number; heightRight: number;
  heightWaist: number; bowLeft: number; bowRight: number;
}): string => {
  // Neither cap may reach past the middle of the body, or the two would cross on a node narrower
  // than a control is high.
  const maxRadius = Math.max(0, (end - start) / 2);
  const radiusLeft = Math.min(heightLeft / 2, maxRadius);
  const radiusRight = Math.min(heightRight / 2, maxRadius);
  const centreLeft = start + radiusLeft;
  const centreRight = end - radiusRight;
  const span = centreRight - centreLeft;
  const waistTop = centreY - (heightWaist / 2);
  const waistBottom = centreY + (heightWaist / 2);

  return [
    `M ${centreLeft} ${centreY - radiusLeft}`,
    `C ${centreLeft + (bowLeft * span)} ${waistTop} ${centreRight - (bowRight * span)} ${waistTop} ${centreRight} ${centreY - radiusRight}`,
    `A ${radiusRight} ${radiusRight} 0 0 1 ${centreRight} ${centreY + radiusRight}`,
    `C ${centreRight - (bowRight * span)} ${waistBottom} ${centreLeft + (bowLeft * span)} ${waistBottom} ${centreLeft} ${centreY + radiusLeft}`,
    `A ${radiusLeft} ${radiusLeft} 0 0 1 ${centreLeft} ${centreY - radiusLeft}`,
    'Z',
  ].join(' ');
};


/**
 * React sub-component of the app module "Header" to render a marker at the active menu node link in
 * the primary section of the header.
 *
 * Without the prop "dynamicEffect" the marker is a box that slides from node to node - the lens of
 * the base design, drawn by its stylesheet. With the prop it is the same lens drawn as a path that
 * **behaves like a body of liquid while it travels**: its two edges are separate springs, so it
 * stretches out of its resting shape under acceleration, thins in the middle, and settles back into
 * the pill at a standstill.
 */
const Marker = ({
  posX, width, menuNodeId, dynamicEffect = false,
}: MarkerProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [prevMenuNodeId, setPrevMenuNodeId] = useState<typeof menuNodeId>();

  // The definitions inside the element are referenced by "url(#…)", so their ids have to be
  // unique per instance and safe inside a fragment reference: useId() answers the first and states
  // no format for what it returns - React 19 wraps its ids in guillemets - so everything but the
  // characters a reference takes without a thought is dropped.
  const elemId = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  const shapeElemRef = useRef<SVGPathElement>(null);
  const clipElemRef = useRef<SVGPathElement>(null);
  const rimElemRef = useRef<SVGPathElement>(null);
  const glowElemRef = useRef<SVGPathElement>(null);
  const gleamElemRef = useRef<SVGRectElement>(null);
  // The live state of the simulation: where the two edges stand and how fast each of them travels.
  // It lives in a ref rather than in a state, because every frame writes it and no render depends
  // on it - the frame draws the path itself.
  const edgesRef = useRef({
    start: posX, end: posX + width, speedStart: 0, speedEnd: 0,
  });
  const isPlacedRef = useRef(false);
  const frameRef = useRef<number>(undefined);
  const menuNodeIdRef = useRef(menuNodeId);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // The box form slides by a transition, and it may only do so from the second node onwards: the
  // first appearance is to stand where it stands.
  const enableAnimation = !dynamicEffect && !!width && (menuNodeId !== prevMenuNodeId);

  if (!dynamicEffect && (menuNodeId !== prevMenuNodeId)) {
    requestAnimationFrame(() => {
      setPrevMenuNodeId(menuNodeId);
    });
  }


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
    if (!dynamicEffect) {
      return undefined;
    }

    const targetStart = posX;
    const targetEnd = posX + width;
    const edges = edgesRef.current;

    /**
     * Draws the lens from the state the simulation currently holds: the mass at the leading end,
     * the smaller ball at the trailing one, the neck between them drawn from how far the body has
     * been pulled past its resting length, and the light lagging behind the movement.
     */
    const draw = () => {
      const restingWidth = Math.max(1, targetEnd - targetStart);
      const currentWidth = Math.max(1, edges.end - edges.start);
      const speed = (edges.speedStart + edges.speedEnd) / 2;
      const speedShare = Math.min(1, Math.abs(speed) / speedForFullEffectPxPerS);
      const stretchShare = Math.max(0, Math.min(1, ((currentWidth / restingWidth) - 1) / (maxStretch - 1)));
      const isTravellingForwards = speed >= 0;

      const heightLead = shapeHeight * (1 - (leadShrink * speedShare));
      const heightTrail = shapeHeight * (1 - (trailShrink * speedShare));
      const heightWaist = Math.min(heightLead, heightTrail) * (1 - (waistPull * stretchShare));

      const path = buildLensPath({
        start: edges.start,
        end: edges.end,
        centreY: shapeTop + (shapeHeight / 2),
        heightLeft: isTravellingForwards ? heightTrail : heightLead,
        heightRight: isTravellingForwards ? heightLead : heightTrail,
        heightWaist,
        bowLeft: isTravellingForwards ? waistFromTrailing : waistFromLeading,
        bowRight: isTravellingForwards ? waistFromLeading : waistFromTrailing,
      });

      // The four elements share one geometry: the pane, the clip the two inner lights are cut with,
      // and those two lights themselves.
      shapeElemRef.current?.setAttribute('d', path);
      clipElemRef.current?.setAttribute('d', path);
      rimElemRef.current?.setAttribute('d', path);
      glowElemRef.current?.setAttribute('d', path);

      // The light sits where the body has come from, at most a share of its length behind the
      // centre, and it is there only while the body moves.
      const centreX = (edges.start + edges.end) / 2;
      const lag = gleamLagShare * (currentWidth / 2) * (isTravellingForwards ? -1 : 1) * speedShare;

      gleamElemRef.current?.setAttribute('x', String(centreX + lag - (gleamWidth / 2)));
      gleamElemRef.current?.setAttribute('opacity', String(gleamMaxOpacity * speedShare));
    };


    /**
     * Snaps both edges onto their targets and draws once, without any travel. The first appearance
     * of the marker takes this path, a marker that only changes its width does too, and so does a
     * viewer who has asked for reduced motion.
     */
    const place = () => {
      edges.start = targetStart;
      edges.end = targetEnd;
      edges.speedStart = 0;
      edges.speedEnd = 0;
      draw();
    };


    /**
     * One step of the simulation. Both edges are pulled towards their target by a spring and slowed
     * by a damper; which of the two springs is the stiff one follows the direction of the travel.
     */
    const step = (timestamp: number, prevTimestamp: number) => {
      const stepS = Math.min(maxStepS, (timestamp - prevTimestamp) / 1000);
      const distanceStart = targetStart - edges.start;
      const distanceEnd = targetEnd - edges.end;
      const isTravellingForwards = (distanceStart + distanceEnd) >= 0;
      const stiffnessStart = isTravellingForwards ? stiffnessTrailing : stiffnessLeading;
      const stiffnessEnd = isTravellingForwards ? stiffnessLeading : stiffnessTrailing;

      edges.speedStart += ((stiffnessStart * distanceStart) - (damping * edges.speedStart)) * stepS;
      edges.speedEnd += ((stiffnessEnd * distanceEnd) - (damping * edges.speedEnd)) * stepS;
      edges.start += edges.speedStart * stepS;
      edges.end += edges.speedEnd * stepS;

      const isAtRest = (Math.abs(distanceStart) < restDistancePx)
        && (Math.abs(distanceEnd) < restDistancePx)
        && (Math.abs(edges.speedStart) < restSpeedPxPerS)
        && (Math.abs(edges.speedEnd) < restSpeedPxPerS);

      if (isAtRest) {
        place();

        return;
      }

      draw();
      frameRef.current = requestAnimationFrame((next) => {
        step(next, timestamp);
      });
    };


    // The marker travels only when it moves from one node to another. Its first appearance, a node
    // that merely changed its width, and a viewer who has asked for reduced motion all place it.
    const isTravel = isPlacedRef.current
      && (menuNodeId !== menuNodeIdRef.current)
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    menuNodeIdRef.current = menuNodeId;
    isPlacedRef.current = true;

    if (!isTravel) {
      place();

      return undefined;
    }

    frameRef.current = requestAnimationFrame((timestamp) => {
      step(timestamp, timestamp);
    });

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [posX, width, menuNodeId, dynamicEffect]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!dynamicEffect) {
    const markerClasses = classNames(css.marker, {
      [css.enableAnimation]: enableAnimation,
    });

    const markerStyle = {
      width: `${width}px`,
      transform: `translateX(${posX}px)`,
    };

    return (
      <div className={markerClasses} style={markerStyle} />
    );
  }


  // The two lights of the glass are the pane's own outline drawn a second and a third time and cut
  // to the pane: the rim one pixel lower, which leaves the bright line along the top edge, and the
  // glow as a wide blurred stroke, of which only the inner half survives the cut. On a box both are
  // inset shadows; a path knows none.
  //
  // The contact shadow and the blur of the glow are filters of the SVG, not CSS filters: Safari
  // applies no CSS filter to an element inside an SVG. Their region reaches beyond the shape far
  // enough for the blurred glow, whose stroke stands four pixels out and blurs by three, and they
  // work in sRGB, the space of a CSS filter, where an SVG filter would work in linearRGB. The
  // colour of the shadow is set in marker.scss.
  return (
    <svg className={css.dynamicMarker} aria-hidden="true">
      <defs>
        <clipPath id={`${elemId}-clip`}>
          <path ref={clipElemRef} />
        </clipPath>
        <filter
          id={`${elemId}-shadow`}
          x="-50%"
          y="-100%"
          width="200%"
          height="300%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            className={css.shapeShadow}
            dx="0"
            dy="1"
            stdDeviation="3"
          />
        </filter>
        <filter
          id={`${elemId}-glowBlur`}
          x="-50%"
          y="-100%"
          width="200%"
          height="300%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <linearGradient id={`${elemId}-gleam`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#fafbfc" stopOpacity="0" />
          <stop offset="50%" stopColor="#fafbfc" stopOpacity="1" />
          <stop offset="100%" stopColor="#fafbfc" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path ref={shapeElemRef} className={css.shape} filter={`url(#${elemId}-shadow)`} />
      <g clipPath={`url(#${elemId}-clip)`}>
        <path ref={glowElemRef} className={css.glow} filter={`url(#${elemId}-glowBlur)`} />
        <path ref={rimElemRef} className={css.rim} transform="translate(0 1)" />
        <rect
          ref={gleamElemRef}
          y={shapeTop}
          width={gleamWidth}
          height={shapeHeight}
          fill={`url(#${elemId}-gleam)`}
          opacity="0"
        />
      </g>
    </svg>
  );
  //                                                                                  </editor-fold>
};


Marker.displayName = 'Marker';


export { Marker };
