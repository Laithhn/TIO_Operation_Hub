import type { DateTimeObj, ExtendedFormat } from '../../dateTimePicker.types';
import type { TabKeyEventHandler } from '../calendar.type';


export interface TimeSectionHandle {
  focusFirst: () => void;
  focusLast: () => void;
  handleTabKeyEvent: TabKeyEventHandler;
}


export interface TimeSectionProps {
  readonly ref: React.RefObject<TimeSectionHandle | null>;
  readonly dateTimeFormat: Partial<ExtendedFormat> & Required<Pick<ExtendedFormat, 'hasHours' | 'hasMinutes' | 'hasSeconds' | 'hourCycle'>>;
  readonly showBackground: boolean;
  readonly dateTimeObj: DateTimeObj;
  readonly dateTimeObj2?: DateTimeObj;
  readonly onChange: (date: Partial<DateTimeObj>) => void;
  readonly onChange2?: (date: Partial<DateTimeObj>) => void;
  readonly onFocusPrev?: () => void;
  readonly onFocusNext?: () => void;
}
