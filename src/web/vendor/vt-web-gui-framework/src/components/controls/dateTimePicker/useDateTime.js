import {
  useState, useRef, useMemo, useCallback, useEffect,
} from 'react';

import { getDaysOfGivenMonth } from 'utils/date';
import { getType } from 'utils/type';


const dateTimeKeys = ['year', 'month', 'day', 'hours', 'minutes', 'seconds'];


/**
 * @typedef {object} DateTimeObject
 * @property {number|null} year - The year of the date.
 * @property {number|null} month - The one-based number of the month of the date (1 - 12).
 * @property {number|null} day - The one-based number of the day of the date (1 - 31).
 * @property {number|null} hours - The hours of the time (0 - 23).
 * @property {number|null} minutes - The minutes of the time (0 - 59).
 * @property {number|null} seconds - The seconds of the time (0 - 59).
 * @property {number} daysOfMonth - The maximum number of days of the month. If the month is not
 *   defined (is null), the default value is 31.
 * @property {boolean} isAnySet - True if any value is set, or false if they are all null.
 * @property {boolean} wasSetInternally - True if the values were changed from inside the date time
 *   picker, or false if they were set from outside of the component.
 */


/**
 * Helper function to convert a given date/time value into an object with the fields "year",
 * "month", "day", "hours", "minutes" and "seconds". Note that the given value is not checked for
 * plausibility and not modified.
 *
 * @param {number|string|Date|DateTimeObject} value - Can be a number (timestamp in ms), a date/time
 *   string, a JavaScript Date object or a DateTimeObject.
 * @param {boolean} [wasSetInternally=false] - True if the values were changed from inside the date
 *   time picker, or false if they were set from outside of the component.
 * @param {string} [timeZone] - If an other time zone has to be used as the locale one, it can be
 *   entered here as IANA time zone (e.g. "Europe/Berlin" or "UTC").
 * @returns {DateTimeObject}
 */
const convertDateTime = (value, wasSetInternally = false, timeZone = null) => {
  const dateTimeObj = {
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
  const valueType = getType(value);
  let date;

  if (((valueType === 'number') && (value >= 0)) || (valueType === 'string')) {
    date = new Date(value);
  } else if (valueType === 'date') {
    date = value;
  }

  if (date && !Number.isNaN(date.getTime())) {
    let fakeDate;

    // Calculate a fake date object, if a time zone string is given. JS Date can't deal with time
    // zones other than UTC and the local one, so we have to fake it here.
    if ((typeof timeZone === 'string') && (timeZone !== '')) {
      try {
        fakeDate = new Date(`${date.toLocaleString('en', { timeZone })} UTC`);
      } catch (e) {
        fakeDate = null;
      }
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
  } else if (valueType === 'object') {
    dateTimeKeys.forEach((key) => {
      const partValue = value[key];
      if (typeof partValue === 'number') {
        dateTimeObj[key] = partValue;
        dateTimeObj.isAnySet = true;
      }
    });
  }

  dateTimeObj.daysOfMonth = getDaysOfGivenMonth(dateTimeObj.month, dateTimeObj.year);
  dateTimeObj.day = (typeof dateTimeObj.day === 'number') ? Math.min(dateTimeObj.day, dateTimeObj.daysOfMonth) : null;

  return dateTimeObj;
};


/**
 *
 */
const useDateTime = (value, withSec, timeZone) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [dateTimeObj, setDateTimeObj] = useState(convertDateTime(value, false, timeZone));

  const prevTimeZoneRef = useRef(timeZone);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // Convert the current values of the date time object into a JavaScript Date object, if it is
  // valid. Otherwise return null.
  const date = useMemo(() => {
    let ret = null;

    if (
      (dateTimeObj.year !== null) && (dateTimeObj.month >= 1) && (dateTimeObj.day >= 1)
      && (dateTimeObj.hours !== null) && (dateTimeObj.minutes !== null)
      && (!withSec || (dateTimeObj.seconds !== null))
    ) {
      ret = new Date(dateTimeObj.year, (dateTimeObj.month - 1), dateTimeObj.day, dateTimeObj.hours, dateTimeObj.minutes, dateTimeObj.seconds ?? 0);

      // If a time zone is given, convert its IANA name into a short name first, for example
      // "Asia/Tokyo" into "GMT+9". "UTC" will stay "UTC".
      if ((typeof timeZone === 'string') && (timeZone !== '')) {
        let timeZoneShort;

        try {
          timeZoneShort = ret.toLocaleString('en', { timeZone, timeZoneName: 'short' }).split(' ').slice(-1)[0] ?? null;
        } catch (e) {
          timeZoneShort = null;
        }

        if (timeZoneShort) {
          ret = new Date(`${dateTimeObj.month}/${dateTimeObj.day}/${dateTimeObj.year}, ${dateTimeObj.hours}:${dateTimeObj.minutes}:${dateTimeObj.seconds ?? 0} ${timeZoneShort}`);
        }
      }
    }

    return ret;
  }, [dateTimeObj, withSec, timeZone]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Memoized helper function to set the values of the date time object by given arguments. These
   * can either be:
   * - one argument with value null to reset the date/time,
   * - one argument with a number as value to set these timestamp,
   * - one argument as object with key-value-pairs of date time values,
   * - two arguments where the 1st one is the key and the snd one is the value of a key-value-pair.
   * This function has only be used internally inside the date time picker to set the date and or
   * time values.
   */
  const setValues = useCallback((...args) => {
    let values = {};

    if (args.length === 1) {
      if ((args[0] === null) || (typeof args[0] === 'number')) {
        values = convertDateTime(args[0], true, timeZone);
      } else if (typeof args[0] === 'object') {
        ([values] = args);
      }
    } else if (args.length > 1) {
      values = { [args[0]]: args[1] };
    }

    const keys = Object.keys(values).filter((key) => dateTimeKeys.includes(key));

    if (keys.length === 0) {
      return;
    }

    setDateTimeObj((prevObj) => {
      if (keys.every((key) => (values[key] === prevObj[key]))) {
        return prevObj;
      }

      const nextObj = {
        ...prevObj,
        ...values,
        wasSetInternally: true,
      };

      nextObj.daysOfMonth = getDaysOfGivenMonth(nextObj.month, nextObj.year);
      nextObj.day = (typeof nextObj.day === 'number') ? Math.min(nextObj.day, nextObj.daysOfMonth) : null;
      nextObj.isAnySet = dateTimeKeys.some((key) => (nextObj[key] !== null));

      return nextObj;
    });
  }, [timeZone]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // Effect to set the values of the date time object, if the value given from outside of the date
  // time picker changes. If the time zone changes, it is handled like an internal change.
  useEffect(() => {
    setDateTimeObj((prevObj) => {
      const nextObj = convertDateTime(value, (prevTimeZoneRef.current !== timeZone), timeZone);

      return (
        dateTimeKeys.every((key) => (nextObj[key] === prevObj[key]))
        && (nextObj.wasSetInternally === prevObj.wasSetInternally)
          ? prevObj : nextObj
      );
    });

    prevTimeZoneRef.current = timeZone;
  }, [value, timeZone]);


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

export default useDateTime;
