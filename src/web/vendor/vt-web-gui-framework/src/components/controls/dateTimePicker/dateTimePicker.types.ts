import type { StylingPropCollection } from 'components/hooks/useStylingProps';

import type { Icons } from 'VtWebGuiIcons/src';


export const dateTimePickerStylingProps = [
  'gridArea',
  'placeSelf',
  'alignSelf',
  'justifySelf',
  'visible',
] as const;

export type DateTimePickerStylingProps = Pick<StylingPropCollection, (typeof dateTimePickerStylingProps)[number]>;


export type DateTimePickerType = 'dateTime' | 'date' | 'time' | 'free' | 'dateTimeRange' | 'dateRange' | 'timeRange' | 'freeRange';


export type AmPm = 'am' | 'pm';


/** Enumeration for the status of the date and time picker. */
export enum DateTimePickerStatus {
  /** The date and time picker field is idle and can be used. */
  IDLE = 'IDLE',
  /** The date and time picker field is busy. */
  BUSY = 'BUSY',
  /** The date and time picker field shows an error. */
  ERROR = 'ERROR',
  /** The date and time picker field is disabled. */
  DISABLED = 'DISABLED',
}


export type FormatId = 'year' | 'month' | 'day' | 'hours' | 'hoursH12' | 'minutes' | 'seconds' | 'amPm';

export interface ExtendedFormat {
  formatStr: string;
  parts: { chars: string; isFormatPart: boolean }[];
  allFormatIds: FormatId[];
  numFormatIds: number;
  hasDate: boolean;
  hasTime: boolean;
  hasHours: boolean;
  hasMinutes: boolean;
  hasSeconds: boolean;
  hourCycle: 'h12' | 'h23';
}


export interface InternalValuesContextData {
  internalHoursH12: number | null;
  setInternalHoursH12: (value: number | null) => void;
  internalAmPm: AmPm | null;
  setInternalAmPm: (value: AmPm | null) => void;
}


export interface DateTimeObj {
  /** The year of the date. */
  year: number | null;
  /** The one-based number of the month of the date (1 - 12). */
  month: number | null;
  /** The one-based number of the day of the date (1 - 31). */
  day: number | null;
  /** The hours of the time, 24-hours based (0 - 23). */
  hours: number | null;
  /** The minutes of the time (0 - 59). */
  minutes: number | null;
  /** The seconds of the time (0 - 59). */
  seconds: number | null;
  /** The maximum number of days of the month. If the month is not defined (is null), the default
   * value is 31. */
  daysOfMonth: number;
  /** True if any value is set, or false if they are all null. */
  isAnySet: boolean;
  /** True if the values were changed from inside the date time picker, or false if they were set
   * from outside of the component. */
  wasSetInternally: boolean;
}


export type DateTimeIds = keyof Pick<DateTimeObj, 'year' | 'month' | 'day' | 'hours' | 'minutes' | 'seconds'>;


export interface UseDateTimeResult {
  dateTimeObj: DateTimeObj;
  date: Date | null;
  setValues: (arg: (number | Partial<Pick<DateTimeObj, 'year' | 'month' | 'day' | 'hours' | 'minutes' | 'seconds'>> | null)) => void;
}


export interface DateTimePickerHandle {
  focus: () => void;
  showCalendar: (withFocus?: boolean) => void;
  hideCalendar: () => void;
}


export interface DateTimePickerProps extends DateTimePickerStylingProps {
  /** The React reference of an imperative handle of the date and time picker. */
  readonly ref?: React.RefObject<DateTimePickerHandle | null>;
  /** Optionally, an ID for the HTML attribute "id" of the date and time picker, written in every
   * build - for example to find it in automated tests. It has to be unique in the whole document,
   * and IDs starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** What the picker takes: a date, a time, both (the default, "dateTime"), or a format of the
   * consumer's own ("free", see prop "freeFormat") - each either as one value or, with the "...Range"
   * types, as a span from one value to a second (see props "value2" and "onChange2"). The date and
   * time formats come from the language files, keys "VIWGF_DATETIME_FORMAT_...". */
  readonly type?: DateTimePickerType;
  /** Whether a time (see prop "type") takes seconds as well (true) or ends with the minutes (false,
   * the default). */
  readonly withSec?: boolean;
  /** The format of the types "free" and "freeRange", built from these placeholders: "Y" (year, four
   * digits, 0000 - 9999), "m" (month, 01 - 12), "d" (day, 01 - 31), "H" (hours, 00 - 23), "h" (hours,
   * 01 - 12) with "a" (am/pm), "i" (minutes, 00 - 59) and "s" (seconds, 00 - 59). Each placeholder
   * counts once, the hours once in either cycle; every other character is shown as it is, and text
   * in double quotes is always shown, so "Today:" H:i gives Today: --:-- although "d" is a
   * placeholder. The control character "\\t" makes a wider gap, as between the date and the time of
   * the type "dateTime". */
  readonly freeFormat?: string;
  /** This prop can be used to determine the status of the date and time picker. By default, all
   * date and time pickers are in idle status (DateTimePickerStatus.IDLE). The date and time picker
   * can be displayed as "busy" (DateTimePickerStatus.BUSY), faulty (DateTimePickerStatus.ERROR) or
   * disabled (DateTimePickerStatus.DISABLED) using this prop. No input can be made in the BUSY and
   * DISABLED statuses. A changed value is no status of the control; the form around it states such
   * a thing. */
  readonly status?: DateTimePickerStatus;
  /** A date and time picker carries a pane of its own, which is what bounds it: it stands on an
   * empty surface and needs nothing arranged around it. Setting this prop to true takes that pane
   * away, so the surrounding layout does the bounding instead - a table whose rows are already
   * divided by lines, for example. The date and time picker keeps its interaction appearance either
   * way. */
  readonly bare?: boolean;
  /** This prop states that the date and time picker ends without an edge of its own on one side
   * ("start" or "end") or on both ("both"), and what that means depends on whether it carries a
   * pane: a date and time picker with one gives up its rounded corners on that side and its border
   * along it, which is what lets it be strung together with another control into one body. A bare
   * date and time picker pulls its inner spacing back with a negative margin, so its value lines up
   * with whatever sits above or below it instead of appearing indented. */
  readonly flush?: 'start' | 'end' | 'both';
  /** Where the fields stand inside the pane, in the room beside the icons: "start" (the default),
   * "end", "center" or "space-between", the values of the CSS property "justify-content". */
  readonly justifyValues?: React.CSSProperties['justifyContent'];
  /** Setting this prop to true displays a button at the end of the date and time picker for
   * deleting the entered values. */
  readonly deleteButton?: boolean;
  /** Any symbol can be displayed at the end of date and time picker. To do this, this prop must be
   * passed the name of the symbol (see indicator component "ICON"). */
  readonly trailingIcon?: Icons;
  /** Setting this prop to true shows a button in the calendar that selects the current date and
   * time. */
  readonly nowButton?: boolean;
  /** The date and time the picker shows, in one of five forms. A timestamp in milliseconds, which
   * stands for a full date and time in UTC; a string the JavaScript method Date.parse() reads; a
   * JavaScript Date object; an object with the optional numeric fields "year", "month", "day",
   * "hours", "minutes" and "seconds", where every field left out or set to null shows its
   * placeholder; or null, which shows nothing but placeholders. A timestamp, a string and a Date are
   * shown in the browser's local time unless the prop "timeZone" names another zone. The picker
   * reads this prop when it changes and holds the value itself in between, reporting every change
   * through "onChange". */
  readonly value?: number | string | Date | Partial<DateTimeObj> | null;
  /** The end of a span, for the "...Range" types (see prop "type"): the start is the prop "value",
   * the end this one, in the same five forms. */
  readonly value2?: number | string | Date | Partial<DateTimeObj> | null;
  /** An IANA time zone, e.g. "Asia/Tokyo", "Europe/London" or "UTC". The values are entered in that
   * zone, and a timestamp, a string or a Date given through "value" and "value2" is converted into it
   * from its UTC value; the browser's local time plays no part then. */
  readonly timeZone?: string | null;
  /** This prop can be used to display a note or error text, e.g. at an incorrect entry, below the
   * date and time picker. If the prop status is simultaneously set to DateTimePickerStatus.ERROR,
   * the notice is highlighted in color as error text. */
  readonly notice?: string | number;
  /** Callback prop, called when the value - or the first value of a span - is changed by the user.
   * It receives the date and time as "dateTimeObj", an object with the numeric fields "year",
   * "month", "day", "hours", "minutes" and "seconds" (null for every part not set), and as "date" a
   * JavaScript Date built from them where year, month, day, hours, minutes and - with the prop
   * "withSec" - seconds are all set, else null. For a span without the prop "onChange2" it receives
   * the second value the same way, as "dateTimeObj2" and "date2". Its identity counts: the picker
   * reports a change from an effect that runs again whenever this prop changes, and so reports the
   * current value once more. */
  readonly onChange?: ({
    dateTimeObj, date, dateTimeObj2, date2,
  }: {
    dateTimeObj: DateTimeObj; date: Date | null; dateTimeObj2?: DateTimeObj; date2?: Date | null;
  }) => void;
  /** Optional callback prop for the "...Range" types, called when the second value of the span is
   * changed by the user. It receives the second value as "dateTimeObj" and "date", in the forms
   * "onChange" describes. Its identity counts: the picker reports a change from an effect that runs
   * again whenever this prop changes, and so reports the current value once more. */
  readonly onChange2?: ({ dateTimeObj, date }: { dateTimeObj: DateTimeObj; date: Date | null }) => void;
}
