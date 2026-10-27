import PropTypes from 'prop-types';
import {
  forwardRef, useState, useRef, useImperativeHandle, useCallback,
} from 'react';

import Enums from 'assets/enums';
import Section from 'components/layouts/section';
import {
  getDayISO, getDaysOfMonth, isToday as dateIsToday, isSameDate,
} from 'utils/date';

import dateTimePickerDefines from '../../../defines';
import { DateTimePickerSelectedDay } from '../../../enums';
import Day from './day';
import Weekdays from './weekdays';


/**
 * React component of a date calendar popup.
 */
const DayView = forwardRef(({
  year, month, firstSelectedDate, secondSelectedDate, onSelect, onTabKey, onArrowKey,
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [dayWidth, setDayWidth] = useState(dateTimePickerDefines.calendar.dateSection.dayMinWidth);

  const allDaysRef = useRef([]);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const dateOfTheFirstDay = new Date(year, month - 1, 1); // the date object of the first day of the given month and year
  const firstDayIdx = getDayISO(dateOfTheFirstDay) - 1; // monday: 0, tuesday: 1,...
  const numDays = getDaysOfMonth(dateOfTheFirstDay);

  const daysArr = new Array(42).fill(null).map((_, idx) => {
    const dayNum = idx - firstDayIdx + 1;
    const dateOfDay = new Date(year, month - 1, dayNum);
    const id = dateOfDay.toISOString();
    const matchFirstSelectedDate = ((firstSelectedDate !== null) && isSameDate(dateOfDay, firstSelectedDate));
    const matchSecondSelectedDate = ((secondSelectedDate !== null) && isSameDate(dateOfDay, secondSelectedDate));
    let selected = DateTimePickerSelectedDay.UNSELECTED;

    if (firstSelectedDate !== null) {
      if ((secondSelectedDate === null) && matchFirstSelectedDate) {
        selected = DateTimePickerSelectedDay.SINGLE_SELECTED;
      } else if (secondSelectedDate !== null) {
        if (matchFirstSelectedDate && matchSecondSelectedDate) {
          selected = DateTimePickerSelectedDay.SINGLE_SELECTED;
        } else if (matchFirstSelectedDate) {
          selected = DateTimePickerSelectedDay.SELECTED_START;
        } else if (matchSecondSelectedDate) {
          selected = DateTimePickerSelectedDay.SELECTED_END;
        } else if (
          (dateOfDay.getTime() > firstSelectedDate.getTime())
          && (dateOfDay.getTime() < secondSelectedDate.getTime())
        ) {
          selected = DateTimePickerSelectedDay.SELECTED_MIDDLE;
        }
      }
    } else if (matchSecondSelectedDate) {
      selected = DateTimePickerSelectedDay.SINGLE_SELECTED;
    }

    if ((dayNum <= 0) || (dayNum > numDays)) {
      return {
        id,
        dayNum: dateOfDay.getDate(),
        isOtherMonth: true,
        isToday: false,
        selected,
      };
    }

    return {
      id,
      dayNum,
      isOtherMonth: false,
      isToday: dateIsToday(dateOfDay),
      selected,
    };
  });


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to create the references of all day components of the current month.
   */
  const createRefs = (element, dayNum) => {
    allDaysRef.current[dayNum] = element;
  };


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    focusTodayOrFirstDay: () => {
      const dayNum = daysArr.find(({ isToday }) => isToday)?.dayNum ?? 1;
      allDaysRef.current[dayNum].focus();
    },
    focusFirstDay: () => {
      allDaysRef.current[1].focus();
    },
    focusLastDay: () => {
      allDaysRef.current[numDays].focus();
    },
    focusDay: (dayNum) => {
      if (allDaysRef.current[dayNum]) {
        allDaysRef.current[dayNum].focus();
        return true;
      }
      return false;
    },
  }), [numDays, daysArr]);


  /*
   * Handler for event "onSelect" on a day component to call prop onSelect.
   */
  const handleSelectDay = useCallback((dayNum, isOtherMonth) => {
    let monthOffset = 0;

    if (isOtherMonth) {
      monthOffset = (dayNum > 15) ? -1 : 1;
    }

    onSelect(dayNum, monthOffset);
  }, [onSelect]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <Section
      gridTemplateRows={`repeat(7, ${dateTimePickerDefines.calendar.dateSection.dayHeight}px)`}
      gridTemplateColumns={`repeat(7, ${dayWidth}px)`}
      justifyContent={Enums.PlaceContent.CENTER}
      paddingTop={Enums.GapAndPadding.enumValueOf(dateTimePickerDefines.calendar.sectionPaddingTop)}
      paddingRight={Enums.GapAndPadding.NORMAL}
      paddingBottom={Enums.GapAndPadding.enumValueOf(dateTimePickerDefines.calendar.sectionPaddingBottom)}
      paddingLeft={Enums.GapAndPadding.NORMAL}
    >
      <Weekdays onSetDayWidth={setDayWidth} />
      {daysArr.map(({
        id, dayNum, isOtherMonth, isToday, selected,
      }) => (
        <Day
          {...(!isOtherMonth && {
            ref: (element) => createRefs(element, dayNum),
          })}
          key={id}
          dayNum={dayNum}
          isOtherMonth={isOtherMonth}
          isToday={isToday}
          selected={selected}
          dayWidth={dayWidth}
          onSelect={handleSelectDay}
          onTabKey={onTabKey}
          onArrowKey={onArrowKey}
        />
      ))}
    </Section>
  );
  //                                                                                  </editor-fold>
});

DayView.displayName = 'DayView';

DayView.propTypes = {
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  firstSelectedDate: PropTypes.objectOf(Date),
  secondSelectedDate: PropTypes.objectOf(Date),
  onSelect: PropTypes.func,
  onTabKey: PropTypes.func,
  onArrowKey: PropTypes.func,
};

DayView.defaultProps = {
  firstSelectedDate: null,
  secondSelectedDate: null,
  onSelect() {},
  onTabKey() {},
  onArrowKey() {},
};

export default DayView;
