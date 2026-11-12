import { useMemo, useState } from 'react';

import { getDateFromZoned, getDaysOfGivenMonth, getZonedDate } from 'utils/date';

import type {
  DateTimeIds, DateTimeObj, DateTimePickerProps, UseDateTimeResult,
} from './dateTimePicker.types';


const dateTimeIds: DateTimeIds[] = ['year', 'month', 'day', 'hours', 'minutes', 'seconds'];


/**
 * Helper function to convert a given date/time value into an object with the fields "year",
 * "month", "day", "hours", "minutes" and "seconds". Note that the given value is not checked for
 * plausibility and not modified.
 *
 * @param value - Can be a number (timestamp in ms), a date/time string, a JavaScript Date object or
 *   a DateTimeObject.
 * @param wasSetInternally - True if the values were changed from inside the date time picker, or
 *   false if they were set from outside of the component.
 * @param timeZone - If an other time zone has to be used as the locale one, it can be entered here
 *   as IANA time zone (e.g. "Europe/Berlin" or "UTC").
 */
const convertDateTime = (value: DateTimePickerProps['value'], wasSetInternally = false, timeZone: string | null = null): DateTimeObj => {
  const dateTimeObj: DateTimeObj = {
    year: null,
    month: null,
    day: null,
    hours: null,
    minutes: null,
    seconds: null,
    daysOfMonth: 31,
    isAnySet: false,
    wasSetInternally,
  };
  let date: Date | undefined;

  if (((typeof value === 'number') && (value >= 0)) || (typeof value === 'string')) {
    date = new Date(value);
  } else if (value instanceof Date) {
    date = value;
  }

  if (date && !Number.isNaN(date.getTime())) {
    let fakeDate: Date | null = null;

    // Calculate a fake date object, if a time zone string is given. JS Date can't deal with time
    // zones other than UTC and the local one, so we have to fake it here.
    if ((typeof timeZone === 'string') && (timeZone !== '')) {
      fakeDate = getZonedDate(date, timeZone);
    }

    if (fakeDate) {
      dateTimeObj.year = fakeDate.getUTCFullYear();
      dateTimeObj.month = fakeDate.getUTCMonth() + 1;
      dateTimeObj.day = fakeDate.getUTCDate();
      dateTimeObj.hours = fakeDate.getUTCHours();
      dateTimeObj.minutes = fakeDate.getUTCMinutes();
      dateTimeObj.seconds = fakeDate.getUTCSeconds();
    } else {
      dateTimeObj.year = date.getFullYear();
      dateTimeObj.month = date.getMonth() + 1;
      dateTimeObj.day = date.getDate();
      dateTimeObj.hours = date.getHours();
      dateTimeObj.minutes = date.getMinutes();
      dateTimeObj.seconds = date.getSeconds();
    }

    dateTimeObj.isAnySet = true;
  } else if (value && (typeof value === 'object') && !(value instanceof Date)) {
    dateTimeIds.forEach((id) => {
      const partValue = value[id];

      if (typeof partValue === 'number') {
        dateTimeObj[id] = partValue;
        dateTimeObj.isAnySet = true;
      }
    });
  }

  dateTimeObj.daysOfMonth = getDaysOfGivenMonth(dateTimeObj.month, dateTimeObj.year);
  dateTimeObj.day = (typeof dateTimeObj.day === 'number') ? Math.min(dateTimeObj.day, dateTimeObj.daysOfMonth) : null;

  return dateTimeObj;
};


/**
 * React hook holding one value of the date time picker as an object of its parts, together with the
 * JavaScript Date built from them where every part a Date needs is set. A new value or time zone
 * given from outside replaces the parts; "setValues" changes them from inside the picker and marks
 * the object as set internally, which is what tells the picker to report the change.
 */
const useDateTime = (value: DateTimePickerProps['value'], withSec: boolean, timeZone: string | null): UseDateTimeResult => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [dateTimeObj, setDateTimeObj] = useState(() => convertDateTime(value, false, timeZone));
  // The value and the time zone this hook last converted, held only to notice that they changed.
  const [prevInputs, setPrevInputs] = useState({ value, timeZone });


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // A new value or time zone from outside replaces the parts in the same render rather than one
  // render later in an effect, which showed the old value for the length of a frame. A change of the
  // time zone counts as an internal change, so the picker reports the converted value. Setting state
  // in the render body stands behind the comparison, which is what keeps it from looping: React
  // discards this pass and renders again before anything reaches the screen.
  if ((value !== prevInputs.value) || (timeZone !== prevInputs.timeZone)) {
    const nextObj = convertDateTime(value, (timeZone !== prevInputs.timeZone), timeZone);

    setPrevInputs({ value, timeZone });

    if (
      !dateTimeIds.every((key) => (nextObj[key] === dateTimeObj[key]))
      || (nextObj.wasSetInternally !== dateTimeObj.wasSetInternally)
    ) {
      setDateTimeObj(nextObj);
    }
  }

  // The current values of the date and time object as a JavaScript Date, if they make a valid one,
  // otherwise null. Its identity is what the effects of the picker watch to report a change, so it
  // may change with the values and the time zone only. useMemo states that here; the React Compiler
  // would keep it as well, but only as long as it compiles this hook, and a bail-out would pass
  // unnoticed.
  const date = useMemo(() => {
    let ret = null;

    if (
      (dateTimeObj.year !== null)
      && (dateTimeObj.month !== null) && (dateTimeObj.month >= 1)
      && (dateTimeObj.day !== null) && (dateTimeObj.day >= 1)
      && (dateTimeObj.hours !== null)
      && (dateTimeObj.minutes !== null)
      && (!withSec || (dateTimeObj.seconds !== null))
    ) {
      ret = new Date(dateTimeObj.year, (dateTimeObj.month - 1), dateTimeObj.day, dateTimeObj.hours, dateTimeObj.minutes, dateTimeObj.seconds ?? 0);

      // If a time zone is given, the values are the wall-clock time in that zone, not in the local
      // one. Where the browser does not know the zone, the local time stays.
      if ((typeof timeZone === 'string') && (timeZone !== '')) {
        const zonedDate = new Date(Date.UTC(dateTimeObj.year, (dateTimeObj.month - 1), dateTimeObj.day, dateTimeObj.hours, dateTimeObj.minutes, dateTimeObj.seconds ?? 0));

        ret = getDateFromZoned(zonedDate, timeZone) ?? ret;
      }
    }

    return ret;
  }, [dateTimeObj, withSec, timeZone]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to set the values of the date and time object by given arguments. These can
   * either be:
   * - one argument with value null to reset the date/time,
   * - one argument with a number as value to set this timestamp,
   * - one argument as object with key-value-pairs of date and time values.
   * This function has only be used internally inside the date and time picker to set the date and /
   * or time values.
   */
  const setValues: UseDateTimeResult['setValues'] = (arg) => {
    const values: Partial<DateTimeObj> = ((arg === null) || (typeof arg === 'number'))
      ? convertDateTime(arg, true, timeZone)
      : { ...arg };

    const dateTimeIdsToSet = (Object.keys(values) as (keyof DateTimeObj)[])
      .filter((id): id is DateTimeIds => dateTimeIds.some((dateTimeId) => (id === dateTimeId)));

    if (dateTimeIdsToSet.length === 0) {
      return;
    }

    setDateTimeObj((prevObj) => {
      if (dateTimeIdsToSet.every((id) => (values[id] === prevObj[id]))) {
        return prevObj;
      }

      const nextObj = {
        ...prevObj,
        ...values,
        wasSetInternally: true,
      };

      nextObj.daysOfMonth = getDaysOfGivenMonth(nextObj.month, nextObj.year);
      nextObj.day = (typeof nextObj.day === 'number') ? Math.min(nextObj.day, nextObj.daysOfMonth) : null;
      nextObj.isAnySet = dateTimeIds.some((key) => (nextObj[key] !== null));

      return nextObj;
    });
  };


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return {
    dateTimeObj,
    date,
    setValues,
  };
  //                                                                                  </editor-fold>
};


export { useDateTime };
