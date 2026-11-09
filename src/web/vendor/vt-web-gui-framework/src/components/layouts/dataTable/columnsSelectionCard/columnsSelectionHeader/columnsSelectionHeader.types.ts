import type { ButtonProps } from 'components/controls/button';
import type { CheckBoxProps } from 'components/controls/checkBox';
import type { InputProps } from 'components/controls/input';


export interface ColumnsSelectionHeaderProps {
  readonly title: string | undefined;
  readonly disableSelectAll: boolean | undefined;
  readonly disableResetAll: boolean | undefined;
  readonly showSearchBox: boolean;
  readonly searchString: string;
  readonly totalValue: CheckBoxProps['value'];
  readonly onSelectAll: NonNullable<CheckBoxProps['onClick']>;
  readonly onResetAll: NonNullable<ButtonProps['onClick']>;
  readonly onChangeSearchString: NonNullable<InputProps['onChange']>;
}
