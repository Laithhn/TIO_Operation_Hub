import type { SelectBoxProps } from '../selectBox.types';

import type { MarkerProps } from './marker/marker.types';
import type { OptionsProps } from './options/options.types';


export interface MenuProps<ValueType> {
  readonly selectBoxRef: React.RefObject<HTMLSpanElement | null>;
  readonly show: boolean;
  readonly contentWidth: number;
  readonly limit: number;
  readonly options: NonNullable<SelectBoxProps<ValueType>['options']>;
  readonly valueIndex: number;
  readonly onSelectOption: OptionsProps<ValueType>['onSelectOption'];
  readonly onReselectCurrentOption: MarkerProps['onClick'];
  readonly onClose: () => void;
}
