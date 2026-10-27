import PropTypes from 'prop-types';
import {
  forwardRef, useState, useRef, useMemo, useImperativeHandle, useCallback, useEffect,
} from 'react';

import Enums from 'assets/enums';
import Button, { ButtonType } from 'components/controls/button';
import SelectBox from 'components/controls/selectBox';
import Section from 'components/layouts/section';
import { hooks } from 'store';

import dateTimePickerDefines from '../../defines';
import DayView from './dayView';


/**
 * Helper function to return the number of the year. If null is given, the current year is returned.
 *
 * @param {number|null} year - The given year.
 * @returns {number}
 */
const deriveYearToShow = (year) => ((year !== null) ? year : (new Date()).getFullYear());


/**
 * Helper function to return the number of the month (1-based). If null is given, the current month
 * is returned.
 *
 * @param {number|null} month - The given 1-based month.
 * @returns {number}
 */
const deriveMonthToShow = (month) => ((month !== null) ? month : ((new Date()).getMonth() + 1));


/**
 * React component of a date calendar popup.
 */
const DateSection = forwardRef(({
  isRtl, showRange, dateTimeObj, dateTimeObj2, onChange, onChange2, onFocusPrev, onFocusNext,
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = hooks.useI18n();

  const [yearToShow, setYearToShow] = useState(deriveYearToShow(dateTimeObj.year));
  const [monthToShow, setMonthToShow] = useState(deriveMonthToShow(dateTimeObj.month));

  const selectBoxMonthRef = useRef();
  const buttonPrevMonthRef = useRef();
  const buttonNextMonthRef = useRef();
  const dayViewRef = useRef();
  const waitToFocusDayRef = useRef(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const monthOptions = useMemo(() => [
    { value: 1, text: translateText('VIWGF_JANUARY_L') },
    { value: 2, text: translateText('VIWGF_FEBRUARY_L') },
    { value: 3, text: translateText('VIWGF_MARCH_L') },
    { value: 4, text: translateText('VIWGF_APRIL_L') },
    { value: 5, text: translateText('VIWGF_MAY_L') },
    { value: 6, text: translateText('VIWGF_JUNE_L') },
    { value: 7, text: translateText('VIWGF_JULY_L') },
    { value: 8, text: translateText('VIWGF_AUGUST_L') },
    { value: 9, text: translateText('VIWGF_SEPTEMBER_L') },
    { value: 10, text: translateText('VIWGF_OCTOBER_L') },
    { value: 11, text: translateText('VIWGF_NOVEMBER_L') },
    { value: 12, text: translateText('VIWGF_DECEMBER_L') },
  ], [translateText]);

  const yearOptions = useMemo(() => new Array(11).fill(null).map((_, idx) => {
    const value = yearToShow - 5 + idx;
    return { value, text: `${value}` };
  }), [yearToShow]);

  let firstSelectedDate = null,
    secondSelectedDate = null;

  if ((dateTimeObj.year !== null) && (dateTimeObj.month !== null) && (dateTimeObj.day !== null)) {
    firstSelectedDate = new Date(dateTimeObj.year, dateTimeObj.month - 1, dateTimeObj.day);
  }

  if (showRange && (dateTimeObj2.year !== null) && (dateTimeObj2.month !== null) && (dateTimeObj2.day !== null)) {
    secondSelectedDate = new Date(dateTimeObj2.year, dateTimeObj2.month - 1, dateTimeObj2.day);

    // swap the selected dates, if both are given and if the first one is larger than the second one
    if ((firstSelectedDate !== null) && (firstSelectedDate.getTime() > secondSelectedDate.getTime())) {
      const tmpDate = firstSelectedDate;
      firstSelectedDate = secondSelectedDate;
      secondSelectedDate = tmpDate;
    }
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const handleSelectMonth = useCallback((nextMonth) => {
    setMonthToShow(nextMonth);
  }, []);


  /**
   *
   */
  const handleSelectYear = useCallback((nextYear) => {
    setYearToShow(nextYear);
  }, []);


  /**
   *
   */
  const handleSelectPrevMonth = useCallback(() => {
    setMonthToShow((prevMonth) => {
      if (prevMonth === 1) {
        setYearToShow((prevYear) => prevYear - 1);
        return 12;
      }

      return prevMonth - 1;
    });
  }, []);


  /**
   *
   */
  const handleSelectNextMonth = useCallback(() => {
    setMonthToShow((prevMonth) => {
      if (prevMonth === 12) {
        setYearToShow((prevYear) => prevYear + 1);
        return 1;
      }

      return prevMonth + 1;
    });
  }, []);


  /**
   * Memoized handler for event "onSelect" of the day view component to select or reselect a single
   * day of this, of the previous or of the next month.
   */
  const handleSelectDay = useCallback((nextDay, monthOffset) => {
    let nextMonth = monthToShow,
      nextYear = yearToShow;

    if (monthOffset !== 0) {
      nextMonth += monthOffset;

      if (nextMonth < 1) {
        nextYear--;
        nextMonth += 12;
      } else if (nextMonth > 12) {
        nextYear++;
        nextMonth -= 12;
      }
    }

    if (showRange) {
      const nextDate = new Date(nextYear, nextMonth - 1, nextDay);

      if ((firstSelectedDate !== null) && (secondSelectedDate === null)) {
        if (nextDate.getTime() < firstSelectedDate.getTime()) {
          onChange({ year: nextYear, month: nextMonth, day: nextDay });
          onChange2({ year: dateTimeObj.year, month: dateTimeObj.month, day: dateTimeObj.day });
        } else {
          onChange2({ year: nextYear, month: nextMonth, day: nextDay });
        }
      } else if ((firstSelectedDate === null) && (secondSelectedDate !== null)) {
        if (nextDate.getTime() > secondSelectedDate.getTime()) {
          onChange({ year: dateTimeObj2.year, month: dateTimeObj2.month, day: dateTimeObj2.day });
          onChange2({ year: nextYear, month: nextMonth, day: nextDay });
        } else {
          onChange({ year: nextYear, month: nextMonth, day: nextDay });
        }
      } else {
        onChange({ year: nextYear, month: nextMonth, day: nextDay });
        onChange2({ year: null, month: null, day: null });
      }
    } else {
      onChange({ year: nextYear, month: nextMonth, day: nextDay });
    }
  }, [showRange, dateTimeObj, dateTimeObj2, onChange, onChange2, yearToShow, monthToShow, firstSelectedDate, secondSelectedDate]);


  /**
   * Memoized handler for event "onTabKey" on a day element of the day view to not switching between
   * the days with the tab key, but switching from the focused day to the previous or next control
   * elements.
   */
  const handleTabKeyOnDay = useCallback((event) => {
    event.stopPropagation();
    event.preventDefault();

    if (event.shiftKey) {
      buttonNextMonthRef.current.focus();
    } else {
      onFocusNext();
    }
  }, [onFocusNext]);


  /**
   * Handler for events "onArrowKey" on a day element of the day view to focus the previous or next
   * day.
   */
  const handleArrowKeyOnDay = useCallback((pos, dayNum) => {
    // ToDo: handle event.shiftKey if it is pressed at moving from the first or from the second
    // selected date to change this selection.

    switch (pos) {
      // -------------------------------------------------------------------------------------------
      case 'left': {
      // -------------------------------------------------------------------------------------------

        const isValid = dayViewRef.current.focusDay(dayNum - 1);

        if (!isValid) {
          document.activeElement.blur();
          waitToFocusDayRef.current = 'last';
          handleSelectPrevMonth();
        }
        break;
      }

      // -------------------------------------------------------------------------------------------
      case 'right': {
      // -------------------------------------------------------------------------------------------

        const isValid = dayViewRef.current.focusDay(dayNum + 1);

        if (!isValid) {
          document.activeElement.blur();
          waitToFocusDayRef.current = 'first';
          handleSelectNextMonth();
        }
        break;
      }


      // -------------------------------------------------------------------------------------------
      case 'up': {
      // -------------------------------------------------------------------------------------------

        const isValid = dayViewRef.current.focusDay(dayNum - 7);

        if (!isValid) {
          document.activeElement.blur();
          waitToFocusDayRef.current = dayNum - 7;
          handleSelectPrevMonth();
        }
        break;
      }

      // -------------------------------------------------------------------------------------------
      case 'down': {
      // -------------------------------------------------------------------------------------------

        const isValid = dayViewRef.current.focusDay(dayNum + 7);

        if (!isValid) {
          document.activeElement.blur();
          waitToFocusDayRef.current = dayNum + 7;
          handleSelectNextMonth();
        }
        break;
      }

        // no default
    }
  }, [handleSelectPrevMonth, handleSelectNextMonth]);


  useImperativeHandle(ref, () => ({
    focusFirst: () => {
      selectBoxMonthRef.current.focus();
    },
    focusLast: () => {
      dayViewRef.current.focusTodayOrFirstDay();
    },
    focusDay: () => {
      dayViewRef.current.focusTodayOrFirstDay();
    },
    handleTabKeyEvent: (event) => {
      if (event.shiftKey && (event.target.dataset?.id === 'selectBoxMonth')) {
        event.stopPropagation();
        event.preventDefault();
        onFocusPrev();
      } else if (!event.shiftKey && (event.target.dataset?.id === 'buttonNextMonth')) {
        event.stopPropagation();
        event.preventDefault();
        dayViewRef.current.focusTodayOrFirstDay();
      }
    },
    selectPrevMonth: () => {
      handleSelectPrevMonth();
      buttonPrevMonthRef.current.focus();
    },
    selectNextMonth: () => {
      handleSelectNextMonth();
      buttonNextMonthRef.current.focus();
    },
  }), [onFocusPrev, handleSelectPrevMonth, handleSelectNextMonth]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    setYearToShow(deriveYearToShow(dateTimeObj.year));
  }, [dateTimeObj.year]);


  useEffect(() => {
    setMonthToShow(deriveMonthToShow(dateTimeObj.month));
  }, [dateTimeObj.month]);


  useEffect(() => {
    if (waitToFocusDayRef.current !== null) {
      if (waitToFocusDayRef.current === 'first') {
        dayViewRef.current.focusFirstDay();
      } else if (waitToFocusDayRef.current === 'last') {
        dayViewRef.current.focusLastDay();
      } else if (typeof waitToFocusDayRef.current === 'number') {
        if (waitToFocusDayRef.current < 1) {
          dayViewRef.current.focusDay(new Date(yearToShow, monthToShow, waitToFocusDayRef.current).getDate());
        } else {
          dayViewRef.current.focusDay(new Date(yearToShow, monthToShow - 2, waitToFocusDayRef.current).getDate());
        }
      }

      waitToFocusDayRef.current = null;
    }
  }, [yearToShow, monthToShow]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <>
      <Section
        gridAutoFlow={Enums.GridAutoFlow.COLUMN}
        justifyContent={Enums.PlaceContent.SPACE_BETWEEN}
        alignContent={Enums.PlaceContent.CENTER}
        paddingTop={Enums.GapAndPadding.enumValueOf(dateTimePickerDefines.calendar.sectionPaddingTop)}
        paddingRight={Enums.GapAndPadding.NORMAL}
        paddingBottom={Enums.GapAndPadding.enumValueOf(dateTimePickerDefines.calendar.sectionPaddingBottom)}
        paddingLeft={Enums.GapAndPadding.NORMAL}
        backgroundColor={Enums.BackgroundColor.STRUCTURE_SILVER}
      >
        <SelectBox
          ref={selectBoxMonthRef}
          id="selectBoxMonth"
          darkTheme
          selectByWheel
          options={monthOptions}
          value={monthToShow}
          onSelect={handleSelectMonth}
        />
        <SelectBox
          darkTheme
          selectByWheel
          options={yearOptions}
          value={yearToShow}
          onSelect={handleSelectYear}
        />
        <Section
          gridAutoFlow={Enums.GridAutoFlow.COLUMN}
          columnGap={Enums.GapAndPadding.SMALL}
        >
          <Button
            ref={buttonPrevMonthRef}
            type={ButtonType.ICON}
            darkTheme
            icon={isRtl ? 'NAVIRIGHT' : 'NAVILEFT'}
            onClick={handleSelectPrevMonth}
          />
          <Button
            ref={buttonNextMonthRef}
            id="buttonNextMonth"
            type={ButtonType.ICON}
            darkTheme
            icon={isRtl ? 'NAVILEFT' : 'NAVIRIGHT'}
            onClick={handleSelectNextMonth}
          />
        </Section>
      </Section>
      <DayView
        ref={dayViewRef}
        year={yearToShow}
        month={monthToShow}
        firstSelectedDate={firstSelectedDate}
        secondSelectedDate={secondSelectedDate}
        onSelect={handleSelectDay}
        onTabKey={handleTabKeyOnDay}
        onArrowKey={handleArrowKeyOnDay}
      />
    </>
  );
  //                                                                                  </editor-fold>
});

DateSection.displayName = 'DateSection';

DateSection.propTypes = {
  showRange: PropTypes.bool,
  isRtl: PropTypes.bool,
  dateTimeObj: PropTypes.shape({
    year: PropTypes.number,
    month: PropTypes.number,
    day: PropTypes.number,
  }),
  dateTimeObj2: PropTypes.shape({
    year: PropTypes.number,
    month: PropTypes.number,
    day: PropTypes.number,
  }),
  onChange: PropTypes.func,
  onChange2: PropTypes.func,
  onFocusPrev: PropTypes.func,
  onFocusNext: PropTypes.func,
};

DateSection.defaultProps = {
  showRange: false,
  isRtl: false,
  dateTimeObj: {
    year: null,
    month: null,
    day: null,
  },
  dateTimeObj2: {
    year: null,
    month: null,
    day: null,
  },
  onChange() {},
  onChange2() {},
  onFocusPrev() {},
  onFocusNext() {},
};

export default DateSection;
