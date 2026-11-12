import {
  useEffect, useId, useImperativeHandle, useReducer, useRef, useState,
} from 'react';

import { Controls } from './controls/Controls';
import type { ControlsHandle } from './controls/controls.type';
import type { DateSectionProps } from './dateSection.type';
import { DayView } from './dayView/DayView';
import type { DayViewHandle } from './dayView/dayView.types';
import {
  decrementMonth, displayedMonthInit, displayedMonthReducer, incrementMonth, selectMonth, selectYear,
  setFromProp, setMonth, setYear,
} from './displayedMonth.reducer';


/**
 * React sub-component of the control component "DateTimePicker".
 */
const DateSection = ({
  ref, dateTimeObj, dateTimeObj2, onChange, onChange2, onFocusPrev, onFocusNext,
}: DateSectionProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [displayMonthState, displayMonthDispatch] = useReducer(displayedMonthReducer, dateTimeObj, displayedMonthInit);
  const monthToShow = selectMonth(displayMonthState);
  const yearToShow = selectYear(displayMonthState);

  const [prevDateTimeObj, setPrevDateTimeObj] = useState(dateTimeObj);

  const controlsRef = useRef<ControlsHandle>(null);
  const dayViewRef = useRef<DayViewHandle>(null);
  const waitToFocusDayRef = useRef<'first' | 'last' | number | null>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // The HTML IDs of the first and the last element of the controls, which the Tab handling below
  // recognizes the event target by, since the handles of the controls expose no element.
  const idPrefix = `viwgf_${useId()}`;
  const selectBoxMonthId = `${idPrefix}selectBoxMonth`;
  const buttonNextMonthId = `${idPrefix}buttonNextMonth`;

  const showRange = !!dateTimeObj2 && !!onChange2;

  if (dateTimeObj !== prevDateTimeObj) {
    if ((dateTimeObj.month !== prevDateTimeObj.month) || (dateTimeObj.year !== prevDateTimeObj.year)) {
      displayMonthDispatch(setFromProp(dateTimeObj));
    }
    setPrevDateTimeObj(dateTimeObj);
  }


  let firstSelectedDate: Date | null = null,
    secondSelectedDate: Date | null = null;

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

  useImperativeHandle(ref, () => ({
    focusFirst: () => {
      controlsRef.current?.focusFirstElement();
    },
    focusLast: () => {
      dayViewRef.current?.focusTodayOrFirstDay();
    },
    focusDay: () => {
      dayViewRef.current?.focusTodayOrFirstDay();
    },
    handleTabKeyEvent: (event) => {
      if (event.shiftKey && ((event.target as HTMLElement).id === selectBoxMonthId)) {
        event.stopPropagation();
        event.preventDefault();
        onFocusPrev?.();
      } else if (!event.shiftKey && ((event.target as HTMLElement).id === buttonNextMonthId)) {
        event.stopPropagation();
        event.preventDefault();
        dayViewRef.current?.focusTodayOrFirstDay();
      }
    },
    selectPrevMonth: () => {
      displayMonthDispatch(decrementMonth());
      controlsRef.current?.focusButtonPrevMonth();
    },
    selectNextMonth: () => {
      displayMonthDispatch(incrementMonth());
      controlsRef.current?.focusButtonNextMonth();
    },
  }), [selectBoxMonthId, buttonNextMonthId, onFocusPrev]);


  /**
   * Handler for the callback prop "onSelectMonth" of the control component "Controls".
   */
  const handleSelectMonth: NonNullable<React.ComponentProps<typeof Controls>['onSelectMonth']> = ({ value }) => {
    displayMonthDispatch(setMonth(value));
  };


  /**
   * Handler for the callback prop "onSelectYear" of the control component "Controls".
   */
  const handleSelectYear: NonNullable<React.ComponentProps<typeof Controls>['onSelectYear']> = ({ value }) => {
    displayMonthDispatch(setYear(value));
  };


  /**
   * Handler for the callback prop "onDecrementMonth" of the control component "Controls" to select
   * the previous month.
   */
  const handleDecrementMonth: NonNullable<React.ComponentProps<typeof Controls>['onDecrementMonth']> = () => {
    displayMonthDispatch(decrementMonth());
  };


  /**
   * Handler for the callback prop "onIncrementMonth" of the control component "Controls" to select
   * the next month.
   */
  const handleIncrementMonth: NonNullable<React.ComponentProps<typeof Controls>['onIncrementMonth']> = () => {
    displayMonthDispatch(incrementMonth());
  };


  /**
   * Handler for the callback prop "onSelect" of the sub-component "DayView" to select or reselect a
   * single day of this, of the previous or of the next month.
   */
  const handleSelectDay: React.ComponentProps<typeof DayView>['onSelect'] = ({ dayNum, prevDayNum, monthOffset }) => {
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

    if (!showRange) {
      onChange({ year: nextYear, month: nextMonth, day: dayNum });
    } else {
      const nextDate = new Date(nextYear, nextMonth - 1, dayNum);

      if (prevDayNum) {
        if ((dateTimeObj.year === nextYear) && (dateTimeObj.month === nextMonth) && (dateTimeObj.day === prevDayNum)) {
          if ((secondSelectedDate === null) || (nextDate.getTime() <= secondSelectedDate.getTime())) {
            onChange({ year: nextYear, month: nextMonth, day: dayNum });
          } else {
            onChange2({ year: nextYear, month: nextMonth, day: dayNum });
            onChange({ year: dateTimeObj2.year, month: dateTimeObj2.month, day: dateTimeObj2.day });
          }
        } else if ((dateTimeObj2.year === nextYear) && (dateTimeObj2.month === nextMonth) && (dateTimeObj2.day === prevDayNum)) {
          if ((firstSelectedDate === null) || (nextDate.getTime() >= firstSelectedDate.getTime())) {
            onChange2({ year: nextYear, month: nextMonth, day: dayNum });
          } else {
            onChange({ year: nextYear, month: nextMonth, day: dayNum });
            onChange2({ year: dateTimeObj.year, month: dateTimeObj.month, day: dateTimeObj.day });
          }
        }
      } else if ((firstSelectedDate !== null) && (secondSelectedDate === null)) {
        if (nextDate.getTime() < firstSelectedDate.getTime()) {
          onChange({ year: nextYear, month: nextMonth, day: dayNum });
          onChange2({ year: dateTimeObj.year, month: dateTimeObj.month, day: dateTimeObj.day });
        } else {
          onChange2({ year: nextYear, month: nextMonth, day: dayNum });
        }
      } else if ((firstSelectedDate === null) && (secondSelectedDate !== null)) {
        if (nextDate.getTime() > secondSelectedDate.getTime()) {
          onChange({ year: dateTimeObj2.year, month: dateTimeObj2.month, day: dateTimeObj2.day });
          onChange2({ year: nextYear, month: nextMonth, day: dayNum });
        } else {
          onChange({ year: nextYear, month: nextMonth, day: dayNum });
        }
      } else {
        onChange({ year: nextYear, month: nextMonth, day: dayNum });
        onChange2({ year: null, month: null, day: null });
      }
    }
  };


  /**
   * Handler for the callback prop "onTabKey" of the sub-component "DayView" to not switching
   * between the days with the tab key, but switching from the focused day to the previous or next
   * control elements.
   */
  const handleTabKeyOnDay: React.ComponentProps<typeof DayView>['onTabKey'] = ({ event }) => {
    event.stopPropagation();
    event.preventDefault();

    if (event.shiftKey) {
      controlsRef.current?.focusButtonNextMonth();
    } else {
      onFocusNext?.();
    }
  };


  /**
   * Handler for the callback prop "onArrowKey" of the sub-component "DayView" to focus the previous
   * or next day.
   */
  const handleArrowKeyOnDay: React.ComponentProps<typeof DayView>['onArrowKey'] = ({ dayNum, pos }) => {
    // ToDo: handle event.shiftKey if it is pressed at moving from the first or from the second
    // selected date to change this selection.

    switch (pos) {
      // -------------------------------------------------------------------------------------------
      case 'left': {
      // -------------------------------------------------------------------------------------------

        const isValid = dayViewRef.current?.focusDay(dayNum - 1);

        if (!isValid) {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          waitToFocusDayRef.current = 'last';
          displayMonthDispatch(decrementMonth());
        }
        break;
      }

      // -------------------------------------------------------------------------------------------
      case 'right': {
      // -------------------------------------------------------------------------------------------

        const isValid = dayViewRef.current?.focusDay(dayNum + 1);

        if (!isValid) {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          waitToFocusDayRef.current = 'first';
          displayMonthDispatch(incrementMonth());
        }
        break;
      }

      // -------------------------------------------------------------------------------------------
      case 'up': {
      // -------------------------------------------------------------------------------------------

        const isValid = dayViewRef.current?.focusDay(dayNum - 7);

        if (!isValid) {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          waitToFocusDayRef.current = dayNum - 7;
          displayMonthDispatch(decrementMonth());
        }
        break;
      }

      // -------------------------------------------------------------------------------------------
      case 'down': {
      // -------------------------------------------------------------------------------------------

        const isValid = dayViewRef.current?.focusDay(dayNum + 7);

        if (!isValid) {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          waitToFocusDayRef.current = dayNum + 7;
          displayMonthDispatch(incrementMonth());
        }
        break;
      }

        // no default
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (waitToFocusDayRef.current !== null) {
      if (waitToFocusDayRef.current === 'first') {
        dayViewRef.current?.focusFirstDay();
      } else if (waitToFocusDayRef.current === 'last') {
        dayViewRef.current?.focusLastDay();
      } else if (typeof waitToFocusDayRef.current === 'number') {
        if (waitToFocusDayRef.current < 1) {
          dayViewRef.current?.focusDay(new Date(yearToShow, monthToShow, waitToFocusDayRef.current).getDate());
        } else {
          dayViewRef.current?.focusDay(new Date(yearToShow, monthToShow - 2, waitToFocusDayRef.current).getDate());
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
      <Controls
        ref={controlsRef}
        selectBoxMonthId={selectBoxMonthId}
        buttonNextMonthId={buttonNextMonthId}
        month={monthToShow}
        year={yearToShow}
        onSelectMonth={handleSelectMonth}
        onSelectYear={handleSelectYear}
        onDecrementMonth={handleDecrementMonth}
        onIncrementMonth={handleIncrementMonth}
      />
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
};

DateSection.displayName = 'DateSection';


export { DateSection };
