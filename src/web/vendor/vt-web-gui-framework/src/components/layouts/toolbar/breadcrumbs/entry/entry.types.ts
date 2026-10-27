import type { SelectBoxProps } from 'components/controls/selectBox';


export interface EntryProps {
  readonly id: string;
  readonly disable: boolean;
  readonly value: string | number | null;
  readonly icon?: string;
  readonly options?: NonNullable<SelectBoxProps<string | number>['options']>;
  readonly onSelect?: ({ id, value, event }: { id: string; value: string | number | null; event?: KeyboardEvent | React.KeyboardEvent<HTMLSpanElement> | React.MouseEvent<SVGElement | HTMLDivElement | HTMLSpanElement> | React.TouchEvent<HTMLSpanElement> | React.WheelEvent<HTMLSpanElement> }) => void;
}
