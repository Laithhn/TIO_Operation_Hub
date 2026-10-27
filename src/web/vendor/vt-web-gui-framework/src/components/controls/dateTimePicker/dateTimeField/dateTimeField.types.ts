import type { DateTimeObj, ExtendedFormat, UseDateTimeResult } from '../dateTimePicker.types';


export interface DateTimeFieldHandle {
  readonly focusFirst: () => void;
  readonly focusLast: (clear: boolean) => void;
}


export interface DateTimeFieldProps {
  readonly ref: React.RefObject<DateTimeFieldHandle | null>;
  readonly disable?: boolean;
  readonly dense?: boolean;
  readonly dateTimeFormat: Partial<ExtendedFormat> & Required<Pick<ExtendedFormat, 'parts' | 'allFormatIds' | 'numFormatIds'>>;
  readonly dateTimeObj: DateTimeObj;
  readonly onChange: UseDateTimeResult['setValues'];
  readonly onFocusPrev?: ({ clear }: { clear?: boolean }) => void;
  readonly onFocusNext?: () => void;
  readonly onBlurFirst?: () => void;
  readonly onBlurLast?: () => void;
}
