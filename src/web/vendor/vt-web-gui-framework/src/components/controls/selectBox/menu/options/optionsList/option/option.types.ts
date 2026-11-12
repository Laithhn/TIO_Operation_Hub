import type { SelectBoxProps } from '../../../../selectBox.types';


export interface OptionProps<ValueType> {
  readonly value: NonNullable<SelectBoxProps<ValueType>['options']>[number]['value'];
  readonly text: NonNullable<SelectBoxProps<ValueType>['options']>[number]['text'];
  readonly disable: NonNullable<SelectBoxProps<ValueType>['options']>[number]['isDisabled'];
  readonly italic: NonNullable<SelectBoxProps<ValueType>['options']>[number]['isItalic'];
  readonly dir: NonNullable<SelectBoxProps<ValueType>['options']>[number]['dir'];
  readonly onClick: ({ value, event }: { value: ValueType; event: React.MouseEvent<HTMLDivElement> }) => void;
}
