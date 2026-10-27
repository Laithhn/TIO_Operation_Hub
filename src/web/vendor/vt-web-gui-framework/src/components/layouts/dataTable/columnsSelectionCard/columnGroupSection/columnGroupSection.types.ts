import type { ButtonProps } from 'components/controls/button';
import type { CheckBoxProps } from 'components/controls/checkBox';
import type { ColumnGroupId } from 'components/helpers/tablePreparer';


export interface ColumnGroupSectionProps {
  readonly columnGroupId: ColumnGroupId;
  readonly groupLabel: string | undefined;
  readonly showSelectGroup: boolean;
  readonly disableSelectGroup: boolean | undefined;
  readonly disableResetGroup: boolean | undefined;
  readonly groupValue: CheckBoxProps['value'];
  readonly columns: {
    readonly idx: number;
    readonly label: string;
    readonly disabled: boolean;
    readonly value: NonNullable<CheckBoxProps['value']>;
  }[];
  readonly onSelectGroup: ({ id, event }: { id: ColumnGroupId; event: Parameters<NonNullable<CheckBoxProps['onClick']>>[0]['event'] }) => void;
  readonly onResetGroup: ({ id, event }: { id: ColumnGroupId; event: Parameters<NonNullable<ButtonProps['onClick']>>[0]['event'] }) => void;
  readonly onSelectColumn: ({ id, idx, event }: { id: ColumnGroupId; idx: number; event: React.MouseEvent | React.PointerEvent | React.KeyboardEvent }) => void;
}
