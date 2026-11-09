import type { DateTimeObj, ExtendedFormat, UseDateTimeResult } from '../dateTimePicker.types';


export type TabKeyEventHandler = (event: React.KeyboardEvent<HTMLElement>) => void;


/** The kind of selection, a day in the calendar can have. */
export type SelectedDay = 'unselected' | 'singleSelected' | 'selectedStart' | 'selectedMiddle' | 'selectedEnd';


export interface CalendarProps {
  readonly dateTimePickerRef: React.RefObject<HTMLElement | null>;
  readonly show?: boolean;
  readonly showWithFocus?: boolean;
  readonly dateTimeFormat: Partial<ExtendedFormat> & Required<Pick<ExtendedFormat, 'hasDate' | 'hasTime' | 'hasHours' | 'hasMinutes' | 'hasSeconds' | 'hourCycle'>>;
  readonly showNowButton?: boolean;
  readonly dateTimeObj: DateTimeObj;
  readonly dateTimeObj2?: DateTimeObj;
  readonly onChange: UseDateTimeResult['setValues'];
  readonly onChange2?: UseDateTimeResult['setValues'];
  readonly onClose: () => void;
  readonly onPressEscape: () => void;
}
