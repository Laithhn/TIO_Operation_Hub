import PropTypes from 'prop-types';

import { hooks } from 'store';

import dateTimePickerDefines from '../../../../../defines';
import { DateTimePickerSelectedDay } from '../../../../../enums';
import css from './selectedMarker.scss';


/**
 * React component to display a selection marker of a single day in the calendar.
 */
const SelectedMarker = ({ selected, dayWidth }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = hooks.useI18n();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const diameter = Math.min(dayWidth, dateTimePickerDefines.calendar.dateSection.dayHeight);
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
    ...((selected === DateTimePickerSelectedDay.SINGLE_SELECTED) && {
      left: leftRightPosPx,
      right: leftRightPosPx,
      borderRadius: radiusPx,
    }),
    ...((selected === (isRtl ? DateTimePickerSelectedDay.SELECTED_END : DateTimePickerSelectedDay.SELECTED_START)) && {
      left: leftRightPosPx,
      borderRadius: `${radiusPx} 0 0 ${radiusPx}`,
    }),
    ...((selected === (isRtl ? DateTimePickerSelectedDay.SELECTED_START : DateTimePickerSelectedDay.SELECTED_END)) && {
      right: leftRightPosPx,
      borderRadius: `0 ${radiusPx} ${radiusPx} 0`,
    }),
    top: `${(dateTimePickerDefines.calendar.dateSection.dayHeight - diameter) / 2}px`,
    bottom: `${(dateTimePickerDefines.calendar.dateSection.dayHeight - diameter) / 2}px`,
  };

  return (
    <span className={css.selectedMarker} style={selectedMarkerStyle} />
  );
  //                                                                                  </editor-fold>
};

SelectedMarker.displayName = 'SelectedMarker';

SelectedMarker.propTypes = {
  selected: PropTypes.instanceOf(DateTimePickerSelectedDay),
  dayWidth: PropTypes.number,
};

SelectedMarker.defaultProps = {
  selected: DateTimePickerSelectedDay.UNSELECTED,
  dayWidth: dateTimePickerDefines.calendar.dateSection.dayMinWidth,
};

export default SelectedMarker;
