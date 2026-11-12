import {
  getDayOfYear, getDaysOfMonth, getUTCDayOfYear, getUTCDaysOfMonth, getUTCWeekOfYear, getWeekOfYear,
  getZonedDate,
} from 'utils/date';
import { getType } from 'utils/type';

import type { I18nLanguageTable } from '../i18n.types';


/**
 * Helper function to format the date and time of the given Date object or of a given UNIX timestamp
 * into a string with a given format. The format is leaned on PHP function date().
 *
 * @param table - The language table to use for the translation.
 * @param date - A Date object, a date string or a UNIX timestamp as number in milliseconds.
 * @param format - The format string or a key in the language table with the format string as value,
 *   see PHP function data().
 * @param utcOrTimeZone - Optionally set to true, to use the UTC date and time of the given Date
 *   object / timestamp. If an IANA time zone is given as string, the given UTC Date object /
 *   timestamp is converted into this. If false is given, the given date and time is converted into
 *   the local time zone of the browser (all including the consideration of daylight saving time /
 *   sommer time).
 */
export const translateDate = (
  table: I18nLanguageTable | null,
  date: Date | string | number,
  format: string,
  utcOrTimeZone: boolean | string = false,
): string => {
  const d = (getType(date) === 'date') ? date as Date : new Date(date);

  if (Number.isNaN(d.getTime())) {
    return '';
  }

  const f = table?.[format] ?? format;

  const formatLength = f.length;
  let fakeDate: Date | null = null,
    year: number, month: number, day: number, weekDay: number, hours: number, minutes: number, seconds: number, milliseconds: number,
    ret = '';

  // Calculate a fake date object, if a time zone string is given. JS Date can't deal with time
  // zones other than UTC and the local one, so we have to fake it here.
  if ((typeof utcOrTimeZone === 'string') && (utcOrTimeZone !== '')) {
    fakeDate = getZonedDate(d, utcOrTimeZone);
  }

  if (utcOrTimeZone === false) {
    year = d.getFullYear();
    month = d.getMonth() + 1; // [1, 12]
    day = d.getDate(); // [1, 31]
    weekDay = d.getDay(); // [0, 6] for Sunday, Monday, Tuesday,...
    hours = d.getHours(); // [0, 23]
    minutes = d.getMinutes(); // [0, 59]
    seconds = d.getSeconds(); // [0, 59]
    milliseconds = d.getMilliseconds(); // [0, 999]
  } else if (fakeDate) {
    year = fakeDate.getUTCFullYear();
    month = fakeDate.getUTCMonth() + 1;
    day = fakeDate.getUTCDate();
    weekDay = fakeDate.getUTCDay();
    hours = fakeDate.getUTCHours();
    minutes = fakeDate.getUTCMinutes();
    seconds = fakeDate.getUTCSeconds();
    milliseconds = d.getUTCMilliseconds(); // must be taken from the original date object
  } else {
    year = d.getUTCFullYear();
    month = d.getUTCMonth() + 1;
    day = d.getUTCDate();
    weekDay = d.getUTCDay();
    hours = d.getUTCHours();
    minutes = d.getUTCMinutes();
    seconds = d.getUTCSeconds();
    milliseconds = d.getUTCMilliseconds();
  }

  for (let i = 0; i < formatLength; i++) {
    const char = f.charAt(i);
    let res = '';

    switch (char) {
      // -------------------------------------------------------------------------------------------
      case 'd': // day of the month, 2 digits with leading zeros: 01 to 31
      case 'j': // day of the month without leading zeros: 1 to 31
      // -------------------------------------------------------------------------------------------

        res = ((char === 'd') && (day < 10)) ? `0${day}` : String(day);
        break;

      // -------------------------------------------------------------------------------------------
      case 'D': //  textual representation of a day, three letters: Mon to Sun (will be translated in the actual language)
      case 'l': // full textual representation of the day of the week: Monday to Sunday (will be translated in the actual language)
      // -------------------------------------------------------------------------------------------

        switch (weekDay) {
          case 0: res = table?.[`VIWGF_SUNDAY_${(char === 'D') ? 'S' : 'L'}`] ?? '???'; break;
          case 1: res = table?.[`VIWGF_MONDAY_${(char === 'D') ? 'S' : 'L'}`] ?? '???'; break;
          case 2: res = table?.[`VIWGF_TUESDAY_${(char === 'D') ? 'S' : 'L'}`] ?? '???'; break;
          case 3: res = table?.[`VIWGF_WEDNESDAY_${(char === 'D') ? 'S' : 'L'}`] ?? '???'; break;
          case 4: res = table?.[`VIWGF_THURSDAY_${(char === 'D') ? 'S' : 'L'}`] ?? '???'; break;
          case 5: res = table?.[`VIWGF_FRIDAY_${(char === 'D') ? 'S' : 'L'}`] ?? '???'; break;
          case 6: res = table?.[`VIWGF_SATURDAY_${(char === 'D') ? 'S' : 'L'}`] ?? '???'; break;
          default: res = '???';
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'N': // ISO-8601 numeric representation of the day of the week: 1 (for Monday) to 7 (for Sunday)
      case 'w': // numeric representation of the day of the week: 0 (for Sunday) to 6 (for Saturday)
      // -------------------------------------------------------------------------------------------

        res = ((char === 'w') || (weekDay > 0)) ? String(weekDay) : '7';
        break;

      // -------------------------------------------------------------------------------------------
      case 'S': // english ordinal suffix for the day of the month: "st", "nd", "rd" or "th" (works well with "j")
      // -------------------------------------------------------------------------------------------

        switch (day) {
          case 1: res = 'st'; break;
          case 2: res = 'nd'; break;
          case 3: res = 'rd'; break;
          default: res = 'th'; break;
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'z': // the day of the year: 0 to 365
      // -------------------------------------------------------------------------------------------

        if (utcOrTimeZone === false) {
          res = String(getDayOfYear(d)); // [0, 365]
        } else if (fakeDate) {
          res = String(getUTCDayOfYear(fakeDate));
        } else {
          res = String(getUTCDayOfYear(d));
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'W': // ISO-8601 week number of year (weeks starting on Monday), example: 42 for the 42nd week in the year
      // -------------------------------------------------------------------------------------------

        if (utcOrTimeZone === false) {
          res = String(getWeekOfYear(d));
        } else if (fakeDate) {
          res = String(getUTCWeekOfYear(fakeDate));
        } else {
          res = String(getUTCWeekOfYear(d));
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'm': // numeric representation of a month, with leading zeros: 01 to 12
      case 'n': // nmeric representation of a month without leading zeros: 1 to 12
      // -------------------------------------------------------------------------------------------

        res = ((char === 'm') && (month < 10)) ? `0${month}` : String(month);
        break;


      // -------------------------------------------------------------------------------------------
      case 'M': // short textual representation of a month, three letters: Jan to Dec (will be translated in the actual language)
      case 'F': // full textual representation of a month: January to December (will be translated in the actual language)
      // -------------------------------------------------------------------------------------------

        switch (month) {
          case 1: res = table?.[`VIWGF_JANUARY_${(char === 'M') ? 'S' : 'L'}`] ?? '???'; break;
          case 2: res = table?.[`VIWGF_FEBRUARY_${(char === 'M') ? 'S' : 'L'}`] ?? '???'; break;
          case 3: res = table?.[`VIWGF_MARCH_${(char === 'M') ? 'S' : 'L'}`] ?? '???'; break;
          case 4: res = table?.[`VIWGF_APRIL_${(char === 'M') ? 'S' : 'L'}`] ?? '???'; break;
          case 5: res = table?.[`VIWGF_MAY_${(char === 'M') ? 'S' : 'L'}`] ?? '???'; break;
          case 6: res = table?.[`VIWGF_JUNE_${(char === 'M') ? 'S' : 'L'}`] ?? '???'; break;
          case 7: res = table?.[`VIWGF_JULY_${(char === 'M') ? 'S' : 'L'}`] ?? '???'; break;
          case 8: res = table?.[`VIWGF_AUGUST_${(char === 'M') ? 'S' : 'L'}`] ?? '???'; break;
          case 9: res = table?.[`VIWGF_SEPTEMBER_${(char === 'M') ? 'S' : 'L'}`] ?? '???'; break;
          case 10: res = table?.[`VIWGF_OCTOBER_${(char === 'M') ? 'S' : 'L'}`] ?? '???'; break;
          case 11: res = table?.[`VIWGF_NOVEMBER_${(char === 'M') ? 'S' : 'L'}`] ?? '???'; break;
          case 12: res = table?.[`VIWGF_DECEMBER_${(char === 'M') ? 'S' : 'L'}`] ?? '???'; break;
          default: res = '???';
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 't': // number of days in the given month: 28 to 31
      // -------------------------------------------------------------------------------------------

        if (utcOrTimeZone === false) {
          res = String(getDaysOfMonth(d));
        } else if (fakeDate) {
          res = String(getUTCDaysOfMonth(fakeDate));
        } else {
          res = String(getUTCDaysOfMonth(d));
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'Y': // full numeric representation of a year with 4 digits: 1999 or 2003
      // -------------------------------------------------------------------------------------------

        res = String(year);
        break;

      // -------------------------------------------------------------------------------------------
      case 'y': // a two digit representation of a year with leading zero: 99 or 03
      // -------------------------------------------------------------------------------------------

        res = String(year).substring(2);
        break;

      // -------------------------------------------------------------------------------------------
      case 'a': // lowercase ante meridiem and post meridiem: am or pm
      // -------------------------------------------------------------------------------------------

        res = (hours < 12) ? 'am' : 'pm';
        break;

      // -------------------------------------------------------------------------------------------
      case 'A': // uppercase ante meridiem and post meridiem: AM or PM
      // -------------------------------------------------------------------------------------------

        res = (hours < 12) ? 'AM' : 'PM';
        break;

      // -------------------------------------------------------------------------------------------
      case 'g': // 12-hour format of an hour without leading zeros: 1 to 12
      // -------------------------------------------------------------------------------------------

        if (hours === 0) {
          res = '12';
        } else {
          res = String((hours > 12) ? (hours - 12) : hours);
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'G': // 24-hour format of an hour without leading zeros: 0 to 23
      // -------------------------------------------------------------------------------------------

        res = String(hours);
        break;

      // -------------------------------------------------------------------------------------------
      case 'h': // 12-hour format of an hour with leading zeros: 01 to 12
      // -------------------------------------------------------------------------------------------

        if (hours === 0) {
          res = '12';
        } else {
          res = String((hours > 12) ? (hours - 12) : hours).padStart(2, '0');
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'H': // 24-hour format of an hour with leading zeros: 00 to 23
      // -------------------------------------------------------------------------------------------

        res = String(hours).padStart(2, '0');
        break;

      // -------------------------------------------------------------------------------------------
      case 'i': // minutes with leading zeros: 00 to 59
      // -------------------------------------------------------------------------------------------

        res = String(minutes).padStart(2, '0');
        break;

      // -------------------------------------------------------------------------------------------
      case 's': // seconds with leading zeros: 00 to 59
      // -------------------------------------------------------------------------------------------

        res = String(seconds).padStart(2, '0');
        break;

      // -------------------------------------------------------------------------------------------
      case 'v': // milliseconds with leading zeros: 000 to 999
      // -------------------------------------------------------------------------------------------

        res = String(milliseconds).padStart(3, '0');
        break;

      // -------------------------------------------------------------------------------------------
      case '\\': // escape letters
      // -------------------------------------------------------------------------------------------

        i++;
        if (i < formatLength) {
          res = f.charAt(i);
        }
        break;

      default:
        res = char;
    }

    ret += res;
  }

  return ret;
};
