import type { DateTimeObj } from '../../dateTimePicker.types';
import type { TabKeyEventHandler } from '../calendar.type';


export type DisplayedMonthActions
  = | { type: 'SET_FROM_PROP'; payload: DateTimeObj }
    | { type: 'SET_MONTH'; payload: number }
    | { type: 'SET_YEAR'; payload: number }
    | { type: 'DECREMENT_MONTH' }
    | { type: 'INCREMENT_MONTH' }
    | undefined;


export interface DisplayedMonthState {
  /** The number of the month (1 - 12) to show in the calender. */
  month: number;
  /** The full year to show in the calendar. */
  year: number;
}


export interface DateSectionHandle {
  focusFirst: () => void;
  focusLast: () => void;
  focusDay: () => void;
  handleTabKeyEvent: TabKeyEventHandler;
  selectPrevMonth: () => void;
  selectNextMonth: () => void;
}


export interface DateSectionProps {
  readonly ref: React.RefObject<DateSectionHandle | null>;
  readonly dateTimeObj: DateTimeObj;
  readonly dateTimeObj2?: DateTimeObj;
  readonly onChange: (date: Partial<DateTimeObj>) => void;
  readonly onChange2?: (date: Partial<DateTimeObj>) => void;
  readonly onFocusPrev?: () => void;
  readonly onFocusNext?: () => void;
}
