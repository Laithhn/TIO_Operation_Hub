import type { SelectBoxProps } from '../../selectBox.types';

import type { OptionsListProps } from './optionsList/optionsList.types';


export interface OptionsProps<ValueType> {
  readonly top: number;
  readonly options: NonNullable<SelectBoxProps<ValueType>['options']>;
  readonly onSelectOption: OptionsListProps<ValueType>['onSelectOption'];
}
