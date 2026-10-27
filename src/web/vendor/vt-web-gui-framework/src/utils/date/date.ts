import type { DateTimeObj } from './date.types';


/**
 * Exported function to return the ISO-8601 numeric representation of the day of the week of the
 * given date.
 *
 * @returns The day of the week, from 1 for Monday to 7 for Sunday.
 */
export const getDayISO = (date: Date): number => {
  const day = date.getDay();
  return (day > 0) ? day : 7;
};


/**
 * Exported function to return the ISO-8601 numeric representation of the day of the week of the
 * given date in UTC.
 *
 * @returns The day of the week, from 1 for Monday to 7 for Sunday.
 */
export const getUTCDayISO = (date: Date): number => {
  const day = date.getUTCDay();
  return (day > 0) ? day : 7;
};


/**
 * Exported function to return the number of the day of the year of the given date.
 *
 * @returns The day of the year, starting with 0.
 */
export const getDayOfYear = (date: Date): number => {
  const year = date.getFullYear();
  return Math.ceil((
    Number(new Date(year, date.getMonth(), date.getDate(), 12, 0, 0))
    - Number(new Date(year, 0, 1, 12, 0, 0))
  ) / 86400000);
};


/**
 * Exported function to return the number of the day of the year of the given date in UTC.
 *
 * @returns The day of the year, starting with 0.
 */
export const getUTCDayOfYear = (date: Date): number => {
  const year = date.getUTCFullYear();
  return Math.ceil((
    Number(new Date(year, date.getUTCMonth(), date.getUTCDate(), 12, 0, 0))
    - Number(new Date(year, 0, 1, 12, 0, 0))
  ) / 86400000);
};


/**
 * Exported function to return the number of the week of the year of the given date.
 *
 * @returns The week of the year, starting with 1.
 */
export const getWeekOfYear = (date: Date): number => {
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

  // the week number is the number of weeks between the first thursday of the year and the thursday
  // in the current week. Remark: 604800000 = 7 * 24 * 60 * 60 * 1000
  return (Math.ceil((timestamp - d.getTime()) / 604800000) + 1);
};


/**
 * Exported function to return the number of the week of the year of the given date in UTC.
 *
 * @returns The week of the year, starting with 1.
 */
export const getUTCWeekOfYear = (date: Date): number => {
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
 * Exported function to return the number of days of the month of the given date.
 *
 * @returns The number of days of the month (28 to 31).
 */
export const getDaysOfMonth = (date: Date): number => (
  32 - (new Date(date.getFullYear(), date.getMonth(), 32).getDate())
);


/**
 * Exported function to return the number of days of the month on the given date in UTC.
 *
 * @returns The number of days of the month (28 to 31).
 */
export const getUTCDaysOfMonth = (date: Date): number => (
  32 - (new Date(date.getUTCFullYear(), date.getUTCMonth(), 32).getUTCDate())
);


/**
 * Exported function to return the number of days of the month of a given month and year. If a month
 * is not given, 31 is returned.
 *
 * @param month - The one-based number of the month of the date.
 * @param year - Optionally the year of the date to consider leap years.
 * @returns The number of days of the month (28 to 31).
 */
export const getDaysOfGivenMonth = (month: number | null | undefined, year?: number | null): number => {
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
 * Exported function that returns true, if two given dates (day, month, year) are the same, or false
 * if not.
 */
export const isSameDate = (date1: Date, date2: Date): boolean => (
  (date1.getDate() === date2.getDate())
  && (date1.getMonth() === date2.getMonth())
  && (date1.getFullYear() === date2.getFullYear())
);


/**
 * Exported function that returns true, if the given date (day, month, year) is today, or false if
 * not.
 */
export const isToday = (date: Date): boolean => isSameDate(date, new Date());


/**
 * Exported function that returns true, if the given date is of the actual year, or false if not.
 */
export const isThisYear = (date: Date): boolean => (date.getFullYear() === (new Date()).getFullYear());


/**
 * Exported function that returns true, if the year of the given date is a leap year, or false if
 * not.
 */
export const isLeapYear = (date: Date): boolean => ((new Date(date.getFullYear(), 1, 29).getMonth()) === 1);


/**
 * Exported function that returns true, if the year of the given date is a leap year (in UTC), or
 * false if not.
 */
export const isUTCLeapYear = (date: Date): boolean => ((new Date(date.getUTCFullYear(), 1, 29).getUTCMonth()) === 1);


/**
 * Exported function to return a Date whose UTC fields carry the wall-clock time the given date has
 * in the given IANA time zone, for example "Asia/Tokyo". A JavaScript Date knows no time zone other
 * than UTC and the local one, so the time of the zone is read through Intl and stored as UTC; read
 * it back with the getUTC methods. The milliseconds are dropped. If the browser does not know the
 * time zone, null is returned.
 */
export const getZonedDate = (date: Date, timeZone: string): Date | null => {
  let parts: Intl.DateTimeFormatPart[];

  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    }).formatToParts(date);
  } catch {
    return null;
  }

  const getPart = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => (part.type === type))?.value);
  const zonedDate = new Date(Date.UTC(getPart('year'), (getPart('month') - 1), getPart('day'), getPart('hour'), getPart('minute'), getPart('second')));

  return Number.isNaN(zonedDate.getTime()) ? null : zonedDate;
};


/**
 * Exported function to return the Date at which a wall-clock time occurs in the given IANA time
 * zone, the reverse of getZonedDate: the wall-clock time is expected in the UTC fields of the given
 * Date. Where the time falls into the gap or the overlap of a daylight saving change, one of the two
 * neighboring instants is returned. If the browser does not know the time zone, null is returned.
 */
export const getDateFromZoned = (zonedDate: Date, timeZone: string): Date | null => {
  const wallClockTime = zonedDate.getTime();

  // The offset of the time zone at the given instant in milliseconds. getZonedDate drops the
  // milliseconds, so they are dropped from the instant as well.
  const getOffset = (time: number) => {
    const timeInSeconds = Math.floor(time / 1000) * 1000;
    const zonedAtTime = getZonedDate(new Date(timeInSeconds), timeZone);

    return zonedAtTime ? (zonedAtTime.getTime() - timeInSeconds) : null;
  };

  // The offset at the wall-clock time read as UTC is a first guess. If the instant it leads to lies
  // on the other side of a daylight saving change, the offset there is the right one.
  const firstOffset = getOffset(wallClockTime);

  if (firstOffset === null) {
    return null;
  }

  const secondOffset = getOffset(wallClockTime - firstOffset) ?? firstOffset;

  return new Date(wallClockTime - secondOffset);
};


/**
 * Exported function to parse a given string into an object with date and time values. The string
 * has to contain a date, consisting of day, month and year with seperators ".", "/" or "-".
 * Optionally a time can be given behind the date, consisting of hours, minutes (optional) and
 * seconds (options). The seperators between them has to be ":". The seperator between the date and
 * the time has to be "T", ",", "_", "/", "-" or a whitespace. Before the date there can only be
 * whitespaces, behind the date / time there can be anything. If it is not possible to parse the
 * string, null is returned.
 */
export const parseDateTime = (dateTimeStr: string): DateTimeObj | null => {
  const regExp = /^\s*(?<d1>\d{1,4})(?<dSep1>[./-])(?<d2>\d{1,2})(?<dSep2>[./-])(?<d3>\d{1,4})(?:[T\s,_/-](?<t1>\d{1,2})(?::(?<t2>\d{1,2})(?::(?<t3>\d{1,2}))?)?)?$/;
  const {
    d1, dSep1, d2, dSep2, d3, t1, t2, t3,
  } = regExp.exec(dateTimeStr)?.groups ?? {};

  // day, month and year must be given and the seperators between them must be the same
  if (!d1 || !d2 || !d3 || (dSep1 !== dSep2)) {
    return null;
  }

  const d1Len = d1.length;
  const d3Len = d3.length;
  const nD1 = Number(d1);
  const nD2 = Number(d2);
  const nD3 = Number(d3);

  // One of d1 and d3 must be the year and the other one must be the day or the month. d2 can only
  // be the day or the month.
  if (
    ((d1Len !== 4) && (d3Len !== 4))
    || ((d1Len > 2) && (d3Len > 2))
    || (nD2 === 0)
    || (nD2 > 31)
  ) {
    return null;
  }

  let day, month, year, hours, minutes, seconds;

  if (d1Len === 4) {
    // d1 is the year, d2 and d3 are either the day or the month. If in this case d2 and d3 are both
    // smaller or equal 12, format YYYY<sep>MM<sep>DD is assumed.
    year = nD1;

    if ((nD3 === 0) || (nD3 > 31) || ((nD2 > 12) && (nD3 > 12))) {
      return null;
    }

    if (nD2 > 12) {
      day = nD2;
      month = nD3;
    } else {
      day = nD3;
      month = nD2;
    }
  } else {
    // d3 is the year, d1 and d2 are either the day or the month. If in this case d1 and d2 are both
    // smaller or equal 12, format MM<sep>DD<sep>YYYY is assumed for "/" as seperator and format
    // DD<sep>MM<sep>YYYY is assumed for all other seperators.
    year = nD3;

    if ((nD1 === 0) || (nD1 > 31) || ((nD1 > 12) && (nD2 > 12))) {
      return null;
    }

    if (
      (nD2 > 12)
      || ((dSep1 === '/') && (nD1 <= 12))
    ) {
      day = nD2;
      month = nD1;
    } else {
      day = nD1;
      month = nD2;
    }
  }

  if (!t1 || (Number(t1) > 23)) {
    hours = null;
    minutes = null;
    seconds = null;
  } else {
    hours = Number(t1);

    if (!t2 || (Number(t2) > 59)) {
      minutes = null;
      seconds = null;
    } else {
      minutes = Number(t2);
      seconds = (!t3 || (Number(t3) > 59)) ? null : Number(t3);
    }
  }

  return {
    day, month, year, hours, minutes, seconds,
  };
};
