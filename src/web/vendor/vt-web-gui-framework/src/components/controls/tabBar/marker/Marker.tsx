import { color, colorA } from 'assets/styles';
import { classNames } from 'utils/classNames';

import * as css from './marker.scss';
import type { MarkerProps } from './marker.types';


// The alpha of the lens's fill: thin enough that the bar's ground reads through the lens, so the
// selected tab keeps the lettering of the ground it stands on, dense enough to say which of the
// tabs is the one selected. The glass around it is the surface's own, the full strength, which a
// translucent tint leaves its work - an opaque fill would cancel it and ask for the controls map's
// surfaceColored instead - so the fill is the one thing the lens adds (see marker.scss).
const lensFillAlpha = 0.3;


/**
 * React sub-component of the marker of the control component "TabBar": the lens behind
 * the selected tab's lettering, or the background of that tab, that points out which tab is
 * selected. The tab bar measures and places it; the marker only draws.
 */
const Marker = ({
  pos, offset, dim, animation, backgroundMarker, color: colorKey, cornerRadii,
}: MarkerProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isVertical = (pos === 'left') || (pos === 'right');
  // The colour, in full behind a tab that is filled and translucent in the lens, which lets the
  // bar's ground read through it.
  const background = backgroundMarker
    ? color[colorKey]
    : colorA(colorKey, lensFillAlpha);


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


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if ((offset === null) || (dim === null)) {
    return null;
  }

  const markerClasses = classNames(css.marker, {
    [css.enableAnimation]: animation,
    [css.isLens]: !backgroundMarker,
    [css.isPosTop]: (pos === 'top'),
    [css.isPosBottom]: (pos === 'bottom'),
    [css.isPosLeft]: (pos === 'left'),
    [css.isPosRight]: (pos === 'right'),
  });

  // Where the marker begins along the bar and how long it is comes from the tab bar's measurements,
  // so those two are inline; the two sides across the bar are pinned in the stylesheet, where both
  // forms cover their tab.
  // The marker is placed by its inset and not moved by a transform: a transformed element is
  // painted at its exact fractional position with anti-aliased edges, where every other element is
  // snapped to the device pixel. A background marker whose lower edge lay on a fraction of a pixel,
  // as a tab's height regularly does, therefore showed a hairline of the bar's ground between it
  // and the content it is meant to run into. The logical inset counts from the list's beginning in
  // either text direction. Sliding one absolutely positioned element by its inset costs no layout
  // worth saving.
  //
  // The bar's outer corners go to a filled tab alone, which reaches the bar's edge; the lens stands
  // inside it and keeps the rounding of its own stylesheet.
  const markerStyle: React.CSSProperties = {
    ...(backgroundMarker && cornerRadii),
    ...(isVertical
      ? { top: `${offset}px`, height: `${dim}px` }
      : { insetInlineStart: `${offset}px`, width: `${dim}px` }),
    background,
  };

  return (
    <div aria-hidden="true" className={markerClasses} style={markerStyle} />
  );
  //                                                                                  </editor-fold>
};

Marker.displayName = 'Marker';


export { Marker };
