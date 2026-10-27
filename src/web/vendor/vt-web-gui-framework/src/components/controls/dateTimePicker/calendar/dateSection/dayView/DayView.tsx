import {
  useEffect, useImperativeHandle, useRef, useState,
} from 'react';

import { Section } from 'components/layouts/section';
import {
  getDayISO, getDaysOfMonth, isSameDate, isToday as dateIsToday,
} from 'utils/date';

import {
  dayHeight, dayMinWidth, sectionPaddingBottom, sectionPaddingTop,
} from '../../calendar.dims';
import type { SelectedDay } from '../../calendar.type';

import { Day } from './day/Day';
import type { DayHandle } from './day/day.types';
import type { DayViewProps } from './dayView.types';
import { Weekdays } from './weekdays/Weekdays';


/**
 * React sub-component of the control component "DateTimePicker".
 */
const DayView = ({
  ref, year, month, firstSelectedDate, secondSelectedDate, onSelect, onTabKey, onArrowKey,
}: DayViewProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [dayWidth, setDayWidth] = useState(dayMinWidth);

  const allDaysRef = useRef<(DayHandle | null)[]>([]);
  const movingDayNumRef = useRef<number | null>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const dateOfTheFirstDay = new Date(year, month - 1, 1); // the date object of the first day of the given month and year
  const firstDayIdx = getDayISO(dateOfTheFirstDay) - 1; // monday: 0, tuesday: 1,...
  const numDaysOfMonth = getDaysOfMonth(dateOfTheFirstDay);

  const daysArr = new Array(42).fill(null).map((_, idx) => {
    const dayNum = idx - firstDayIdx + 1;
    const dateOfDay = new Date(year, month - 1, dayNum);
    const id = dateOfDay.toISOString();
    const matchFirstSelectedDate = ((firstSelectedDate !== null) && isSameDate(dateOfDay, firstSelectedDate));
    const matchSecondSelectedDate = ((secondSelectedDate !== null) && isSameDate(dateOfDay, secondSelectedDate));
    let selected: SelectedDay = 'unselected';

    if (firstSelectedDate !== null) {
      if ((secondSelectedDate === null) && matchFirstSelectedDate) {
        selected = 'singleSelected';
      } else if (secondSelectedDate !== null) {
        if (matchFirstSelectedDate && matchSecondSelectedDate) {
          selected = 'singleSelected';
        } else if (matchFirstSelectedDate) {
          selected = 'selectedStart';
        } else if (matchSecondSelectedDate) {
          selected = 'selectedEnd';
        } else if (
          (dateOfDay.getTime() > firstSelectedDate.getTime())
          && (dateOfDay.getTime() < secondSelectedDate.getTime())
        ) {
          selected = 'selectedMiddle';
        }
      }
    } else if (matchSecondSelectedDate) {
      selected = 'singleSelected';
    }

    if ((dayNum <= 0) || (dayNum > numDaysOfMonth)) {
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


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    focusTodayOrFirstDay: () => {
      const dayNum = daysArr.find(({ isToday }) => isToday)?.dayNum ?? 1;
      allDaysRef.current[dayNum]?.focus();
    },
    focusFirstDay: () => {
      allDaysRef.current[1]?.focus();
    },
    focusLastDay: () => {
      allDaysRef.current[numDaysOfMonth]?.focus();
    },
    focusDay: (dayNum) => {
      if (allDaysRef.current[dayNum]) {
        allDaysRef.current[dayNum].focus();
        return true;
      }
      return false;
    },
  }), [numDaysOfMonth, daysArr]);


  /**
   * React callback reference of all days of the month.
   */
  const dayRefCallback: ((node: DayHandle | null, dayNum: number) => (undefined | (() => void))) = (node, dayNum) => {
    if (!node) {
      return undefined;
    }

    allDaysRef.current[dayNum] = node;

    return () => {
      allDaysRef.current[dayNum] = null;
    };
  };


  /**
   * Handler for the callback prop "onSetDayWidth" of the sub-component "Weekdays".
   */
  const handleSetDayWidth: React.ComponentProps<typeof Weekdays>['onSetDayWidth'] = ({ dayWidth: nextDayWidth }) => {
    setDayWidth(nextDayWidth);
  };


  /*
   * Handler for the callback prop "onSelect" of the sub-component "Day".
   */
  const handleSelectDay: React.ComponentProps<typeof Day>['onSelect'] = ({ dayNum, isOtherMonth }) => {
    let monthOffset = 0;

    if (isOtherMonth) {
      monthOffset = (dayNum > 15) ? -1 : 1;
    }

    onSelect({ dayNum, monthOffset });
  };


  /**
   * Handler for the callback prop "onMoveSelected" of the sub-component "Day".
   */
  const handleMoveSelected: React.ComponentProps<typeof Day>['onMoveSelected'] = ({ dayNum, startMoving }) => {
    if (startMoving) {
      movingDayNumRef.current = dayNum;
    } else if (movingDayNumRef.current !== null) {
      onSelect({ dayNum, prevDayNum: movingDayNumRef.current, monthOffset: 0 });
      movingDayNumRef.current = dayNum;
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    const handleWindowPointerUp = () => {
      movingDayNumRef.current = null;
    };

    window.addEventListener('pointerup', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, []);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <Section
      gridTemplateRows={`repeat(7, ${dayHeight}px)`}
      gridTemplateColumns={`repeat(7, ${dayWidth}px)`}
      justifyContent="center"
      paddingTop={sectionPaddingTop}
      paddingRight="normal"
      paddingBottom={sectionPaddingBottom}
      paddingLeft="normal"
    >
      <Weekdays onSetDayWidth={handleSetDayWidth} />
      {daysArr.map(({
        id, dayNum, isOtherMonth, isToday, selected,
      }) => (
        <Day
          {...(!isOtherMonth && {
            ref: (node) => dayRefCallback(node, dayNum),
          })}
          key={id}
          dayNum={dayNum}
          isOtherMonth={isOtherMonth}
          isToday={isToday}
          selected={selected}
          dayWidth={dayWidth}
          onSelect={handleSelectDay}
          onMoveSelected={handleMoveSelected}
          onTabKey={onTabKey}
          onArrowKey={onArrowKey}
        />
      ))}
    </Section>
  );
  //                                                                                  </editor-fold>
};

DayView.displayName = 'DayView';


export { DayView };
