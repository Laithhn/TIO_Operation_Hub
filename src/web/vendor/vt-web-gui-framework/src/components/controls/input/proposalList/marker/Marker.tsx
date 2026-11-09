import * as css from './marker.scss';
import type { MarkerProps } from './marker.types';


/**
 * React sub-component of the control component "Input", that is placed below the marked
 * entry of the proposal list.
 */
const Marker = ({ top }: MarkerProps) => (
  <div
    className={css.marker}
    style={{ transform: `translateY(${top}px)` }}
  />
);

Marker.displayName = 'Marker';


export { Marker };
