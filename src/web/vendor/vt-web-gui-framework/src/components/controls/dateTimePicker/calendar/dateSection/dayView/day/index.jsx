import PropTypes from 'prop-types';
import {
  memo, forwardRef, useRef, useImperativeHandle,
} from 'react';

import classNames from 'utils/classNames';

import dateTimePickerDefines from '../../../../defines';
import { DateTimePickerSelectedDay } from '../../../../enums';
import SelectedMarker from './selectedMarker';
import css from './day.scss';


/**
 * Memoized React component to display a single day in the calendar.
 */
const Day = memo(forwardRef(({
  dayNum, isOtherMonth, isToday, selected, dayWidth, onSelect, onTabKey, onArrowKey,
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const dayRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isSelected = selected !== DateTimePickerSelectedDay.UNSELECTED;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    focus: () => {
      requestAnimationFrame(() => {
        dayRef.current.focus();
      });
    },
  }), []);


  /**
   * Handler for synthetic React event "onClick" on the day element to select it.
   */
  const handleClick = (event) => {
    event.stopPropagation();
    onSelect(dayNum, isOtherMonth);
  };


  /**
   * Handler for synthetic React event "onKeyDown" on the day element of this month for keyboard
   * control (selection, navigation).
   */
  const handleKeyDownThisMonth = (event) => {
    switch (event.key) {
      case ' ':
      case 'Enter':
        event.stopPropagation();
        onSelect(dayNum, false);
        break;

      case 'Tab':
        event.stopPropagation();
        onTabKey(event);
        break;

      case 'ArrowLeft':
        event.stopPropagation();
        onArrowKey('left', dayNum, event);
        break;

      case 'ArrowRight':
        event.stopPropagation();
        onArrowKey('right', dayNum, event);
        break;

      case 'ArrowUp':
        event.stopPropagation();
        onArrowKey('up', dayNum, event);
        break;

      case 'ArrowDown':
        event.stopPropagation();
        onArrowKey('down', dayNum, event);
        break;
      // no default
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const numberClasses = classNames(css.number, {
    [css.typoDarkTheme]: isSelected,
    [css.typoDisabled]: isOtherMonth,
    [css.today]: isToday,
    [css.selected]: isSelected,
  });

  const numberStyle = {
    left: `${(dayWidth - dateTimePickerDefines.calendar.dateSection.todayCircleDiameter) / 2}px`,
  };

  return (
    <span
      ref={dayRef}
      role="button"
      tabIndex={0}
      className={css.day}
      onClick={handleClick}
      onKeyDown={isOtherMonth ? undefined : handleKeyDownThisMonth}
    >
      {isSelected && (
        <SelectedMarker selected={selected} dayWidth={dayWidth} />
      )}
      <span className={numberClasses} style={numberStyle}>{dayNum}</span>
    </span>
  );
  //                                                                                  </editor-fold>
}));

Day.displayName = 'Day';

Day.propTypes = {
  dayNum: PropTypes.number.isRequired,
  isOtherMonth: PropTypes.bool,
  isToday: PropTypes.bool,
  selected: PropTypes.instanceOf(DateTimePickerSelectedDay),
  dayWidth: PropTypes.number,
  onSelect: PropTypes.func,
  onTabKey: PropTypes.func,
  onArrowKey: PropTypes.func,
};

Day.defaultProps = {
  isOtherMonth: false,
  isToday: false,
  selected: DateTimePickerSelectedDay.UNSELECTED,
  dayWidth: dateTimePickerDefines.calendar.dateSection.dayMinWidth,
  onTabKey() {},
  onArrowKey() {},
  onSelect() {},
};

export default Day;
