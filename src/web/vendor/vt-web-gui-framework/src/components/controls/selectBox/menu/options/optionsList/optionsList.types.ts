import type { SelectBoxProps } from '../../../selectBox.types';

import type { OptionProps } from './option/option.types';


export interface OptionsListProps<ValueType> {
  readonly options: NonNullable<SelectBoxProps<ValueType>['options']>;
  readonly onSelectOption: OptionProps<ValueType>['onClick'];
}
