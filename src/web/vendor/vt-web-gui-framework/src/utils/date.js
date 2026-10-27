/**
 * Exported function to return the ISO-8601 numeric representation of the day of the week of the
 * given date: from 1 for Monday to 7 for Sunday.
 *
 * @param {Date} date - The date object.
 * @returns {number}
 */
export const getDayISO = (date) => {
  const day = date.getDay();
  return (day > 0) ? day : 7;
};


/**
 * Exported function to return the ISO-8601 numeric representation of the day of the week of the
 * given date in UTC: from 1 for Monday to 7 for Sunday.
 *
 * @param {Date} date - The date object.
 * @returns {number}
 */
export const getUTCDayISO = (date) => {
  const day = date.getUTCDay();
  return (day > 0) ? day : 7;
};


/**
 * Exported function to return the number of the day of the year (starting with 0) of the given
 * date.
 *
 * @param {Date} date - The date object.
 * @returns {number}
 */
export const getDayOfYear = (date) => {
  const year = date.getFullYear();
  return Math.ceil((
    (new Date(year, date.getMonth(), date.getDate(), 12, 0, 0))
    - (new Date(year, 0, 1, 12, 0, 0))
  ) / 86400000);
};


/**
 * Exported function to return the number of the day of the year (starting with 0) of the given date
 * in UTC.
 *
 * @param {Date} date - The date object.
 * @returns {number}
 */
export const getUTCDayOfYear = (date) => {
  const year = date.getUTCFullYear();
  return Math.ceil((
    (new Date(year, date.getUTCMonth(), date.getUTCDate(), 12, 0, 0))
    - (new Date(year, 0, 1, 12, 0, 0))
  ) / 86400000);
};


/**
 * Exported function to return the number of the week of the year (starting with 1) of the given
 * date.
 *
 * @param {Date} date - The date object.
 * @returns {number}
 */
export const getWeekOfYear = (date) => {
  const d = new Date(date.getTime()); // copy of the given date object
  const day = getDayISO(date) - 1; // ISO day of the week, starts on Monday with Monday = 0

  // In ISO-8601, the first week of the year is the week with the first thursday of the year. So set
  // the date to the thursday in the current week.
  d.setDate(d.getDate() - day + 3);

  // get the timestamp in milliseconds of this thursday in the current week
  const timestamp = d.getTime();

  // set the date to the first day in January of the current year
  d.setMonth(0, 1);

  // if this first day in January is not a thursday, correct the date to the next thursday..
  if (d.getDay() !== 4) {
    d.setMonth(0, ((11 - d.getDay()) % 7) + 1);
  }

  // the weeknumber is the number of weeks between the first thursday of the year and the thursday
  // in the current week. Remark: 604800000 = 7 * 24 * 60 * 60 * 1000
  return (Math.ceil((timestamp - d.getTime()) / 604800000) + 1);
};


/**
 * Exported function to return the number of the week of the year (starting with 1) of the given
 * date in UTC.
 *
 * @param {Date} date - The date object.
 * @returns {number}
 */
export const getUTCWeekOfYear = (date) => {
  const d = new Date(date.getTime()); // copy of the given date object
  const day = getUTCDayISO(date) - 1; // ISO day of the week, starts on Monday with Monday = 0

  // In ISO-8601, the first week of the year is the week with the first thursday of the year. So set
  // the date to the thursday in the current week.
  d.setUTCDate(d.getUTCDate() - day + 3);

  // get the timestamp in milliseconds of that thursday in the current week
  const timestamp = d.getTime();

  // set the date to the first day in January of the current year
  d.setUTCMonth(0, 1);

  // if this first day in January is not a thursday, correct the date to the next thursday..
  if (d.getUTCDay() !== 4) {
    d.setUTCMonth(0, ((11 - d.getUTCDay()) % 7) + 1);
  }

  // the weeknumber is the number of weeks between the first thursday of the year and the thursday
  // in the current week. Remark: 604800000 = 7 * 24 * 60 * 60 * 1000
  return (Math.ceil((timestamp - d.getTime()) / 604800000) + 1);
};


/**
 * Exported function to return the number of days of the month (28 to 31) of the given date.
 *
 * @param {Date} date - The date object.
 * @returns {number}
 */
export const getDaysOfMonth = (date) => (
  32 - (new Date(date.getFullYear(), date.getMonth(), 32).getDate())
);


/**
 * Exported function to return the number of days of the month (28 to 31) on the given date in UTC.
 *
 * @param {Date} date - The date object.
 * @returns {number}
 */
export const getUTCDaysOfMonth = (date) => (
  32 - (new Date(date.getUTCFullYear(), date.getUTCMonth(), 32).getUTCDate())
);


/**
 * Exported function to return the number of days of the month (28 to 31) of a given month and year.
 * If a month is not given, 31 is returned..
 *
 * @param {number} month - The one-based number of the month of the date.
 * @param {number} [year] - Optionally the year of the date to consider leap years.
 * @returns {number}
 */
export const getDaysOfGivenMonth = (month, year = null) => {
  switch (month) {
    case 2: {
      const isLeapYear = !year || ((new Date(year, 1, 29).getMonth()) === 1);
      return isLeapYear ? 29 : 28;
    }

    case 4:
    case 6:
    case 9:
    case 11:
      return 30;

    default:
      return 31;
  }
};


/**
 * Exported function to return true when the given dates (day, month, year) are the same.
 *
 * @param {Date} date1 - The date object.
 * @param {Date} date2 - The date object.
 * @returns {boolean}
 */
export const isSameDate = (date1, date2) => (
  (date1.getDate() === date2.getDate())
  && (date1.getMonth() === date2.getMonth())
  && (date1.getFullYear() === date2.getFullYear())
);


/**
 * Exported function to return true when the given date (day, month, year) is today.
 *
 * @param {Date} date - The date object.
 * @returns {boolean}
 */
export const isToday = (date) => isSameDate(date, new Date());


/**
 * Exported function to return true when the given date is of the actual year.
 *
 * @param {Date} date - The date object.
 * @returns {boolean}
 */
export const isThisYear = (date) => (date.getFullYear() === (new Date()).getFullYear());


/**
 * Exported function to return true, if the year of the given date is a leap year, otherwise false.
 *
 * @param {Date} date - The date object.
 * @returns {boolean}
 */
export const isLeapYear = (date) => ((new Date(date.getFullYear(), 1, 29).getMonth()) === 1);


/**
 * Exported function to return true, if the year of the given date is a leap year (in UTC),
 * otherwise false.
 *
 * @param {Date} date - The date object.
 * @returns {boolean}
 */
export const isUTCLeapYear = (date) => ((new Date(date.getUTCFullYear(), 1, 29).getUTCMonth()) === 1);


/**
 * Exported function to parse a given string into an object with date and time values. The string
 * has to contain a date, consisting of day, month and year with seperators ".", "/" or "-".
 * Optionally a time can be given behind the date, consisting of hours, minutes (optional) and
 * seconds (options). The seperators between them has to be ":". The seperator between the date and
* the time has to be "T", ",", "_", "/", "-" or a whitespace. Before the date there can only be
 * whitespaces, behind the date / time there can be anything.
 * If it is not possible to parse the string, null is returned.
 *
 * @param {string} dateTimeStr - The given string with date and time.
 * @returns {{ day: number|null, month: number|null, year: number|null, hours: number|null, minutes: number|null, seconds: number|null }|null}
 */
export const parseDateTime = (dateTimeStr) => {
  const [, d1, dSep1, d2, dSep2, d3, t1, t2, t3] = dateTimeStr.match(/^\s*(\d{1,4})([./-])(\d{1,2})([./-])(\d{1,4})(?:[T\s,_/-](\d{1,2})(?::(\d{1,2})(?::(\d{1,2}))?)?)?$/) ?? [];

  // day, month and year must be given and the seperators between them must be the same
  if (
    (d1 === undefined)
    || (d2 === undefined)
    || (d3 === undefined)
    || (dSep1 !== dSep2)
  ) {
    return null;
  }

  const d1Len = d1.length;
  const d3Len = d3.length;

  // One of d1 and d3 must be the year and the other one must be the day or the month. d2 can only
  // be the day or the month.
  if (
    ((d1Len !== 4) && (d3Len !== 4))
    || ((d1Len > 2) && (d3Len > 2))
    || (d2 === 0)
    || (d2 > 31)
  ) {
    return null;
  }

  let day, month, year, hours, minutes, seconds;

  if (d1Len === 4) {
    year = d1;

    // d1 is the year, d2 and d3 are either the day or the month
    if ((d3 === 0) || (d3 > 31) || ((d2 > 12) && (d3 > 12))) {
      return null;
    }

    if (d2 > 12) {
      day = d2;
      month = d3;
    } else {
      day = d3;
      month = d2;
    }
  } else if (d3Len === 4) {
    year = d3;

    // d3 is the year, d1 and d2 are either the day or the month
    if ((d1 === 0) || (d1 > 31) || ((d1 > 12) && (d2 > 12))) {
      return null;
    }

    if (
      (d2 > 12)
      || ((dSep1 === '/') && (d1 <= 12) && (d2 <= 12))
    ) {
      day = d2;
      month = d1;
    } else {
      day = d1;
      month = d2;
    }
  }

  if ((t1 === undefined) || (t1 > 23)) {
    hours = null;
    minutes = null;
    seconds = null;
  } else {
    hours = parseInt(t1, 10);

    if ((t2 === undefined) || (t2 > 59)) {
      minutes = null;
      seconds = null;
    } else {
      minutes = parseInt(t2, 10);
      seconds = ((t3 === undefined) || (t3 > 59)) ? null : parseInt(t3, 10);
    }
  }

  return {
    day: parseInt(day, 10),
    month: parseInt(month, 10),
    year: parseInt(year, 10),
    hours,
    minutes,
    seconds,
  };
};
