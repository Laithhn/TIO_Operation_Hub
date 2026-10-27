import {
  getDayOfYear, getUTCDayOfYear, getWeekOfYear, getUTCWeekOfYear, getDaysOfMonth, getUTCDaysOfMonth,
} from 'utils/date';
import getUrlOfStaticSource from 'utils/getUrlOfStaticSource';
import { getType } from 'utils/type';


/**
 * Helper function to parse and check a given full language code. The returned object has three
 * fields: "code" is the trimmed and full language code in lower cases, "isoCode" is the first and
 * main part of the code, the ISO 639-1 code. "codeExt" is the extension after the ISO 639-1 code if
 * available, or an empty string if not. If the given language code is not valid, null is returned.
 * @name Store.I18n.parseLanguageCode
 *
 * @param {string} code
 * @returns {{ code: string, isoCode: string, codeExt: string }|{}}
 */
export const parseLanguageCode = (code) => {
  const res = code.toString().trim().toLowerCase().match(/^([a-z0-9]+)(?:[_-]+(.*))?$/);

  if (!res || (res.length !== 3) || (res[1] === '')) {
    return null;
  }

  return {
    code: res[0], // full language code, e.g.: "de", "en-us", "en-gb-customerXY"
    isoCode: res[1], // the ISO 639-1 code, e.g.: "de", "en", "en"
    codeExt: res[2] || '', // the code extension, e.g.: "", "us", "gb-customerXY"
  };
};


/**
 * Helper function to build and return the path of the language table by a given language
 * code and by the desired suffix (e.g. "json" or "xml") of the table.
 * @name Store.I18n.buildLanguageTablePath
 *
 * @param {string} code - The full language code.
 * @param {string} suffix - The desired suffix.
 * @returns {string}
 */
export const buildLanguageTablePath = (code, suffix) => getUrlOfStaticSource(`${process.env.URL_I18N}/${code}.${suffix}`);


/**
 * Helper function to return the data object of the first default language found. If there is no
 * language marked as default, the first available language is taken.
 * @name Store.I18n.findDefaultLanguageByCode
 *
 * @param {{ byCode: object, allCodes: string[]}} languages - The languages object like in the state
 *   with fields "byCode" and "allCodes".
 * @returns {{ code: string, isoCode: string, codeExt: string }|{}}
 */
export const findDefaultLanguageByCode = ({ byCode, allCodes }) => (
  allCodes.find((lc) => byCode[lc].isDefault) ?? allCodes[0]
);


/**
 * Helper function to return the data object of a language selected by a given language code. If no
 * language is found, null is returned.
 * @name Store.I18n.findLanguageByCode
 *
 * @param {{ byCode: object, allCodes: string[]}} languages - The languages object like in the state
 *   with fields "byCode" and "allCodes".
 * @param {string} code - The language code.
 * @returns {Store.I18n.stateLanguage|null}
 */
export const findLanguageByCode = ({ byCode, allCodes }, code) => {
  let language;

  if (typeof code !== 'string') {
    return null;
  }

  const languageCode = code.trim().toLowerCase();
  language = byCode[languageCode] || null;

  if (!language) {
    // split the language code into parts, like "en_us..." so "en" will be splitPart[1] and
    // "us..." will be splitPart[2]
    const splitCode = languageCode.match(/^([a-z0-9]+)(?:[_-]+(.*))?$/);

    if (!splitCode || (splitCode.length !== 3) || (splitCode[1] === '')) {
      return null;
    }

    const isoCode = splitCode[1];
    const codeExt = splitCode[2] || '';

    allCodes.some((lc) => {
      const l = byCode[lc];

      if (
        (l.isoCode === isoCode)
        && ((l.codeExt === '') || (codeExt === ''))
      ) {
        language = l;
        return true;
      }

      return false;
    });
  }

  return language;
};


/**
 * Helper function to load the language table of a given URL path and convert and return the result
 * into an object.
 * @name Store.I18n.loadLanguageTable
 *
 * @param {string} path - The full file path to the language table.
 * @param {string} format - The format of the file of the language table: "json" or "xml".
 */
export const loadLanguageTable = async ({ path, format }) => {
  const response = await fetch(path);
  let table;

  if (format === 'xml') {
    // parse XML data into table object
    const data = await response.text();
    const xmlData = new DOMParser().parseFromString(data, 'application/xml');

    table = {};
    xmlData.querySelectorAll('Entry').forEach((xmlEntry) => {
      table[xmlEntry.getAttribute('id')] = xmlEntry.textContent;
    });
  } else {
    // copy JSON data into table object
    table = await response.json();
  }

  return table;
};


/**
 * Helper function to translate a given key by a given language table.
 * @name Store.I18n.translateText
 *
 * @param {object} table - The language table to use for the translation.
 * @param {string} key - The key of the searched entry in the language table.
 * @param {Array} [params] - Optionally an array with parameters, to replace placeholders like %0,
 *   %1 and so on in the text.
 */
export const translateText = (table, key, params) => {
  const value = table[key] ?? key;

  if (params === undefined) {
    return value;
  }

  if (Array.isArray(params) && (params.length > 0)) {
    return params.reduce((text, param, i) => (
      text.replace(new RegExp(`%${i}`, 'g'), param)
    ), value);
  }

  if ((typeof params === 'string') || (typeof params === 'number')) {
    return value.replace(/%0/, params.toString());
  }

  return value;
};


/**
 * Helper function to format the date and time of the given Date object or of a given UNIX timestamp
 * into a string with a given format. The format is leaned on PHP function date().
 * @name Store.I18n.translateDate
 *
 * @param {object} table - The language table to use for the translation.
 * @param {Date|string|number} date - A Date object, a date string or a UNIX timestamp as number in
 *   milliseconds.
 * @param {string} format - The format string or a key in the language table with the format string
 *   as value, see PHP function data().
 * @param {boolean|string} [utcOrTimeZone=false] - Optionally set to true, to use the UTC date and
 *   time of the given Date object / timestamp. If an IANA time zone is given as string, the given
 *   UTC Date object / timestamp is converted into this. If false is given, the given date and time
 *   is converted into the local time zone of the browser (all including the consideration of
 *   daylight saving time / sommer time).
 * @returns {string} The formatted date / time string.
 */
export const translateDate = (table, date, format, utcOrTimeZone = false) => {
  const d = (getType(date) === 'date') ? date : new Date(date);

  if (!table || Number.isNaN(d.getTime())) {
    return '';
  }

  const f = (table[format] !== undefined) ? table[format] : format;

  const formatLength = f.length;
  let fakeDate,
    year, month, day, weekDay, hours, minutes, seconds, milliseconds,
    ret = '';

  // Calculate a fake date object, if a time zone string is given. JS Date can't deal with time
  // zones other than UTC and the local one, so we have to fake it here.
  if ((typeof utcOrTimeZone === 'string') && (utcOrTimeZone !== '')) {
    try {
      fakeDate = new Date(`${d.toLocaleString('en', { timeZone: utcOrTimeZone })} UTC`);
    } catch (e) {
      fakeDate = null;
    }
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

        res = ((char === 'd') && (day < 10)) ? `0${day}` : day;
        break;

      // -------------------------------------------------------------------------------------------
      case 'D': //  textual representation of a day, three letters: Mon to Sun (will be translated in the actual language)
      case 'l': // full textual representation of the day of the week: Monday to Sunday (will be translated in the actual language)
      // -------------------------------------------------------------------------------------------

        switch (weekDay) {
          case 0: res = table[`VIWGF_SUNDAY_${(char === 'D') ? 'S' : 'L'}`]; break;
          case 1: res = table[`VIWGF_MONDAY_${(char === 'D') ? 'S' : 'L'}`]; break;
          case 2: res = table[`VIWGF_TUESDAY_${(char === 'D') ? 'S' : 'L'}`]; break;
          case 3: res = table[`VIWGF_WEDNESDAY_${(char === 'D') ? 'S' : 'L'}`]; break;
          case 4: res = table[`VIWGF_THURSDAY_${(char === 'D') ? 'S' : 'L'}`]; break;
          case 5: res = table[`VIWGF_FRIDAY_${(char === 'D') ? 'S' : 'L'}`]; break;
          case 6: res = table[`VIWGF_SATURDAY_${(char === 'D') ? 'S' : 'L'}`]; break;
          default: res = '???';
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'N': // ISO-8601 numeric representation of the day of the week: 1 (for Monday) to 7 (for Sunday)
      case 'w': // numeric representation of the day of the week: 0 (for Sunday) to 6 (for Saturday)
      // -------------------------------------------------------------------------------------------

        res = ((char === 'w') || (weekDay > 0)) ? weekDay : '7';
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
          res = getDayOfYear(d); // [0, 365]
        } else if (fakeDate) {
          res = getUTCDayOfYear(fakeDate);
        } else {
          res = getUTCDayOfYear(d);
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'W': // ISO-8601 week number of year (weeks starting on Monday), example: 42 for the 42nd week in the year
      // -------------------------------------------------------------------------------------------

        if (utcOrTimeZone === false) {
          res = getWeekOfYear(d);
        } else if (fakeDate) {
          res = getUTCWeekOfYear(fakeDate);
        } else {
          res = getUTCWeekOfYear(d);
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'm': // numeric representation of a month, with leading zeros: 01 to 12
      case 'n': // nmeric representation of a month without leading zeros: 1 to 12
      // -------------------------------------------------------------------------------------------

        res = ((char === 'm') && (month < 10)) ? `0${month}` : month;
        break;


      // -------------------------------------------------------------------------------------------
      case 'M': // short textual representation of a month, three letters: Jan to Dec (will be translated in the actual language)
      case 'F': // full textual representation of a month: January to December (will be translated in the actual language)
      // -------------------------------------------------------------------------------------------

        switch (month) {
          case 1: res = table[`VIWGF_JANUARY_${(char === 'M') ? 'S' : 'L'}`]; break;
          case 2: res = table[`VIWGF_FEBRUARY_${(char === 'M') ? 'S' : 'L'}`]; break;
          case 3: res = table[`VIWGF_MARCH_${(char === 'M') ? 'S' : 'L'}`]; break;
          case 4: res = table[`VIWGF_APRIL_${(char === 'M') ? 'S' : 'L'}`]; break;
          case 5: res = table[`VIWGF_MAY_${(char === 'M') ? 'S' : 'L'}`]; break;
          case 6: res = table[`VIWGF_JUNE_${(char === 'M') ? 'S' : 'L'}`]; break;
          case 7: res = table[`VIWGF_JULY_${(char === 'M') ? 'S' : 'L'}`]; break;
          case 8: res = table[`VIWGF_AUGUST_${(char === 'M') ? 'S' : 'L'}`]; break;
          case 9: res = table[`VIWGF_SEPTEMBER_${(char === 'M') ? 'S' : 'L'}`]; break;
          case 10: res = table[`VIWGF_OCTOBER_${(char === 'M') ? 'S' : 'L'}`]; break;
          case 11: res = table[`VIWGF_NOVEMBER_${(char === 'M') ? 'S' : 'L'}`]; break;
          case 12: res = table[`VIWGF_DECEMBER_${(char === 'M') ? 'S' : 'L'}`]; break;
          default: res = '???';
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 't': // number of days in the given month: 28 to 31
      // -------------------------------------------------------------------------------------------

        if (utcOrTimeZone === false) {
          res = getDaysOfMonth(d);
        } else if (fakeDate) {
          res = getUTCDaysOfMonth(fakeDate);
        } else {
          res = getUTCDaysOfMonth(d);
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'Y': // full numeric representation of a year with 4 digits: 1999 or 2003
      // -------------------------------------------------------------------------------------------

        res = year;
        break;

      // -------------------------------------------------------------------------------------------
      case 'y': // a two digit representation of a year with leading zero: 99 or 03
      // -------------------------------------------------------------------------------------------

        res = year.toString().substring(2);
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

        if (hours === 0) res = 12;
        else if (hours > 12) res = (hours - 12);
        else res = hours;
        break;

      // -------------------------------------------------------------------------------------------
      case 'G': // 24-hour format of an hour without leading zeros: 0 to 23
      // -------------------------------------------------------------------------------------------

        res = hours;
        break;

      // -------------------------------------------------------------------------------------------
      case 'h': // 12-hour format of an hour with leading zeros: 01 to 12
      // -------------------------------------------------------------------------------------------

        if (hours === 0) res = 12;
        else res = ((hours >= 13) ? (hours - 12) : hours).toString().padStart(2, '0');
        break;

      // -------------------------------------------------------------------------------------------
      case 'H': // 24-hour format of an hour with leading zeros: 00 to 23
      // -------------------------------------------------------------------------------------------

        res = hours.toString().padStart(2, '0');
        break;

      // -------------------------------------------------------------------------------------------
      case 'i': // minutes with leading zeros: 00 to 59
      // -------------------------------------------------------------------------------------------

        res = minutes.toString().padStart(2, '0');
        break;

      // -------------------------------------------------------------------------------------------
      case 's': // seconds with leading zeros: 00 to 59
      // -------------------------------------------------------------------------------------------

        res = seconds.toString().padStart(2, '0');
        break;

      // -------------------------------------------------------------------------------------------
      case 'v': // milliseconds with leading zeros: 000 to 999
      // -------------------------------------------------------------------------------------------

        res = milliseconds.toString().padStart(3, '0');
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

    ret += res.toString();
  }

  return ret;
};
