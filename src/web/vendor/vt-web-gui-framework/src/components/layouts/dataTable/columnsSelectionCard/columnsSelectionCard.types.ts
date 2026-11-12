import type { CheckBoxProps } from 'components/controls/checkBox';
import type {
  Column, ColumnGroupId, TablePreparerProps,
} from 'components/helpers/tablePreparer';
import type { CardProps } from 'components/popups/card';


export type ExtColumn = Column & {
  origHidden?: boolean;
};


export interface AllColumns {
  /** Is set to true, if no column groups are given in the props "freezedColumnGroupIds" and
   * "columnGroupIds". In this case there is only one column group with a generic ID. This column
   * group is displayed without header. */
  isOnlyOneGenericGroupId: boolean;
  /** The IDs of all column groups except for those whose field "selection" is set to "hidden". If
   * a column group has no columns whose field "selection" is not set to "hidden", it is also not
   * listed here. */
  allGroupIds: ColumnGroupId[];
  /** Data of all groups, listet in "allGroupIds". */
  byGroupId: Record<ColumnGroupId, {
    /** If set to true, no common check box for the entire group is displayed in its header. See
     * field "selection" with value "disabled" of the column group. */
    showSelectGroup: boolean;
    groupLabel: string | undefined;
    /** The common check box value or all visible columns. Note that there is always at least one
     * visible column (disabled or not), see field "allGroupIds". */
    groupValue: NonNullable<CheckBoxProps['value']>;
    /** Like "groupValue" but only of those visible columns, that are not disabled (have a clickable
     * check box). This value can be undefined, when there are only disabled columns. */
    groupValueWithoutDisabled: CheckBoxProps['value'];
    /** The original columns array, as it is given by prop "columns", but with an extra field
     * "origHidden" to store the original value of field "hidden" in order to restore the value. */
    origColumnsArr: ExtColumn[];
    /** A columns data array of all columns except of those whose field "selection" is set to
     * "hidden". */
    columnsData: {
      /** The array index of the column in the original columns array. */
      idx: number;
      label: string;
      /* True, if the check box of the column is disabled, see field "selection" with value
       * "disabled" of the column. */
      disabled: boolean;
      value: NonNullable<CheckBoxProps['value']>;
    }[];
    /** Is true, if the check box values of all columns are equal to their original values. */
    areAllValuesDefault: boolean;
  }>;
  /** The common check box value of all visible columns of all column groups. It can be undefined,
   * if there are no visible columns (and column groups) at all. */
  totalValue: CheckBoxProps['value'];
  /** Like "totalValue" but only of those visible columns, that are not disabled (have a clickable
   * check box). This value can also be undefined, when there are only disabled columns. */
  totalValueWithoutDisabled: CheckBoxProps['value'];
  /** Is true, if the check box values of all columns of all column groups are equal to their
   * original values. */
  areAllGroupValuesDefault: boolean;
}


export type FilteredColumns = Pick<AllColumns, 'allGroupIds' | 'byGroupId'>;


export interface ColumnsSelectionCardProps {
  /** Optionally, an ID for the HTML attribute "id" of the columns selection card, written in every
   * build - for example to find it in automated tests. It has to be unique in the whole document,
   * and IDs starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  readonly left?: Required<CardProps>['left'];
  readonly right?: Required<CardProps>['right'];
  readonly width?: Required<CardProps>['width'];
  readonly top?: Required<CardProps>['top'];
  readonly bottom?: Required<CardProps>['bottom'];
  readonly height?: Required<CardProps>['height'];
  readonly insertInPlace?: Required<CardProps>['insertInPlace'];
  readonly anchorElemRef?: Required<CardProps>['anchorElemRef'];
  readonly placeBesideAnchorElem?: Required<CardProps>['placeBesideAnchorElem'];
  readonly softAnchor?: Required<CardProps>['softAnchor'];
  /** Optionally, a title text can be given to the column selection card, which is displayed on the
   * top. Only if a title is given, a check box is also displayed to select / deselect all
   * columns. */
  readonly title?: string;
  readonly noColumnHint?: string;
  /** This callback prop is called when the column selection card is to be closed. This happens when
   * the callback props "onClickBeside", "onPressEscape" or "onMoveAnchorElem" of the used card
   * component are called. */
  /** This property contains the column layout currently used by the data table and corresponds to
   * the description of the prop "columns" of the data table component (see there). */
  readonly columns: Required<TablePreparerProps>['columns'];
  readonly freezedColumnGroupIds?: Required<TablePreparerProps>['freezedColumnGroupIds'];
  readonly columnGroupIds?: Required<TablePreparerProps>['columnGroupIds'];
  /** If this is set to true, a text field is displayed on the column selection card, which can be
   * used to limit the number of displayed columns or to search for columns. */
  readonly searchBox?: boolean;
  readonly columnGroupsLabels?: Record<ColumnGroupId, string> | ((columnGroupId: ColumnGroupId) => string | undefined);
  readonly columnsLabels?: string[] | (({ columnGroupId, columnIdx }: { columnGroupId?: ColumnGroupId; columnIdx: number }) => string | undefined);
  /** This callback prop is called as soon as the view of a column is changed via a select box in
   * the column selection card. If column groups are passed (see above), this function passes an
   * object as argument with the ID of the column group in which the view of columns was changed.
   * The array of the column group, as defined in prop "columns", is always passed in the object. If
   * no column groups are used, this function passes only the array with the column information as
   * in the object. */
  readonly onChangeColumns?: ({ columnGroupId, columns }: { columnGroupId?: ColumnGroupId; columns: Required<TablePreparerProps>['columns'] }) => void;
  readonly onClose?: Required<CardProps>['onClickBeside'] | Required<CardProps>['onPressEscape'] | Required<CardProps>['onMoveAnchorElem'];
}
