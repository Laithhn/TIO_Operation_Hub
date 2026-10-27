import type { CheckBoxProps, CheckBoxValue } from 'components/controls/checkBox';


export interface MenuProps {
  readonly multiSelectBoxRef: React.RefObject<HTMLSpanElement | null>;
  readonly show: boolean;
  readonly showByClick: boolean;
  readonly limit: number;
  readonly hideAllOrNoneCheckbox: boolean;
  readonly searchBox: boolean;
  readonly options: {
    readonly id: string;
    readonly value: boolean;
    readonly text: string;
    readonly isDisabled: boolean;
  }[];
  readonly selectionText: string;
  readonly isCompleteSelection: CheckBoxValue;
  readonly onCompleteSelection: NonNullable<CheckBoxProps['onClick']>;
  readonly onToggleOption: ({ id, event }: { id: string; event: Parameters<NonNullable<CheckBoxProps['onClick']>>[0]['event'] }) => void;
  readonly onClose: () => void;
  readonly onPressEscape: () => void;
}
