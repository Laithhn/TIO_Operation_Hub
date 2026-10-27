import type { ColorKeys } from 'assets/styles';

import type { TabBarPos } from '../tabBar.types';


/** The props of the React sub-component "Marker" of the control component "TabBar", which draws the
 * lens behind the selected tab's lettering or the fill of that tab. */
export interface MarkerProps {
  /** The side the tab bar lies on, which says which axis the marker runs along and which two of its
   * corners the bar rounds. */
  readonly pos: TabBarPos;
  /** Where the marker begins along the bar's axis, in pixels from the beginning of the tab list in
   * either text direction. Null while there is nothing to mark. */
  readonly offset: number | null;
  /** The marker's length along the bar's axis in pixels; null while there is nothing to mark. */
  readonly dim: number | null;
  /** Whether the marker slides to its place rather than appearing there. */
  readonly animation: boolean;
  /** Whether the marker fills the tab's background rather than lying behind its lettering as a
   * lens. */
  readonly backgroundMarker: boolean;
  /** The marker's colour, a key of the palette. */
  readonly color: ColorKeys;
  /** The radii of the two outer corners the bar rounds, as an inline style of logical corner radii
   * and empty without a radius (see TabBar). A background marker takes them, reaching the bar's
   * edge as it does; a lens keeps its own rounding and leaves them aside. */
  readonly cornerRadii: React.CSSProperties;
}
