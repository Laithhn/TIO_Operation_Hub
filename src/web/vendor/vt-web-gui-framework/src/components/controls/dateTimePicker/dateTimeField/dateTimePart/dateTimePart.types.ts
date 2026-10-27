import type {
  DateTimeObj, FormatId, UseDateTimeResult,
} from '../../dateTimePicker.types';


export type DateTimePartHandle = HTMLInputElement;


export interface DateTimePartProps {
  readonly ref: React.Ref<DateTimePartHandle | null>;
  readonly id: FormatId;
  readonly disable: boolean;
  readonly dateTimeObj: DateTimeObj;
  readonly minValue: number | undefined;
  readonly maxValue: number | undefined;
  readonly numDigits: number | undefined;
  readonly placeholderChar: string | undefined;
  readonly onChange: UseDateTimeResult['setValues'];
  readonly onFocusPrev: ({ id, clear }: { id: FormatId; clear?: boolean }) => void;
  readonly onFocusNext: ({ id }: { id: FormatId }) => void;
  readonly onKeyTab?: ({ id, isShiftKey }: { id: FormatId; isShiftKey: boolean }) => void;
}
