import type { ButtonProps } from 'components/controls/button';
import type { SelectBoxProps } from 'components/controls/selectBox';


export interface ControlsHandle {
  focusFirstElement: () => void;
  focusButtonPrevMonth: () => void;
  focusButtonNextMonth: () => void;
}


export interface ControlsProps {
  readonly ref: React.RefObject<ControlsHandle | null>;
  /** The HTML ID of the select box of the month, the first element of the controls. */
  readonly selectBoxMonthId: string;
  /** The HTML ID of the button to the next month, the last element of the controls. */
  readonly buttonNextMonthId: string;
  readonly month: number;
  readonly year: number;
  readonly onSelectMonth: NonNullable<SelectBoxProps<number>['onSelect']>;
  readonly onSelectYear: NonNullable<SelectBoxProps<number>['onSelect']>;
  readonly onDecrementMonth: NonNullable<ButtonProps['onClick']>;
  readonly onIncrementMonth: NonNullable<ButtonProps['onClick']>;
}
