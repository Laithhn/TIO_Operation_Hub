import type { DateTimeObj, ExtendedFormat } from '../../../dateTimePicker.types';
import type { TabKeyEventHandler } from '../../calendar.type';


export interface TimeHandle {
  focusFirst: () => void;
  focusLast: () => void;
  handleTabKeyEvent: TabKeyEventHandler;
}


export interface TimeProps {
  readonly ref: React.RefObject<TimeHandle | null>;
  readonly dateTimeFormat: Partial<ExtendedFormat> & Required<Pick<ExtendedFormat, 'hasHours' | 'hasMinutes' | 'hasSeconds' | 'hourCycle'>>;
  readonly dateTimeObj: DateTimeObj;
  readonly onChange: (date: Partial<DateTimeObj>) => void;
  readonly onFocusPrev?: () => void;
  readonly onFocusNext?: () => void;
}
