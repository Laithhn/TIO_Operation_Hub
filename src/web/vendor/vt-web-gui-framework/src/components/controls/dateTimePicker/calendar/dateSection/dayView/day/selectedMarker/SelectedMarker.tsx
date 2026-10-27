import { dayHeight } from '../../../../calendar.dims';

import * as css from './selectedMarker.scss';
import type { SelectedMarkerProps } from './selectedMarker.types';


/**
 * React sub-component of the control component "DateTimePicker" to display a selection
 * marker behind a single day in the calendar.
 */
const SelectedMarker = ({ selected, dayWidth, isRtl }: SelectedMarkerProps) => {
  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const diameter = Math.min(dayWidth, dayHeight);
  const leftRightPosPx = `${(dayWidth - diameter) / 2}px`;
  const radiusPx = `${diameter / 2}px`;


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

  const selectedMarkerStyle = {
    ...((selected === 'singleSelected') && {
      left: leftRightPosPx,
      right: leftRightPosPx,
      borderRadius: radiusPx,
    }),
    ...((selected === (isRtl ? 'selectedEnd' : 'selectedStart')) && {
      left: leftRightPosPx,
      borderRadius: `${radiusPx} 0 0 ${radiusPx}`,
    }),
    ...((selected === (isRtl ? 'selectedStart' : 'selectedEnd')) && {
      right: leftRightPosPx,
      borderRadius: `0 ${radiusPx} ${radiusPx} 0`,
    }),
    top: `${(dayHeight - diameter) / 2}px`,
    bottom: `${(dayHeight - diameter) / 2}px`,
  };

  return (
    <span className={css.selectedMarker} style={selectedMarkerStyle} />
  );
  //                                                                                  </editor-fold>
};

SelectedMarker.displayName = 'SelectedMarker';


export { SelectedMarker };
