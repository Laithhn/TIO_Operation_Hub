import type { Color, ColorKeys, typo } from 'assets/styles';
import type {
  CellId, ColumnGroupId, DatasetId, TablePreparerProps,
} from 'components/helpers/tablePreparer';
import type { StylingPropCollection } from 'components/hooks/useStylingProps';


// The radius props round the table's surface, not its rows: the table does not clip what it
// scrolls, so a row's background may reach over a rounded corner (accepted on 2026-09-25).
export const dataTableStylingProps = [
  'gridArea',
  'placeSelf',
  'alignSelf',
  'justifySelf',
  'visible',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
  'backgroundColor',
  'boxShadow',
] as const;

export type DataTableStylingProps = Pick<StylingPropCollection, (typeof dataTableStylingProps)[number]>;


/** Type of a function to get the content and meta information about a cell of a partial dataset. */
export type CellIterator = ({
  tableId, columnGroupId, datasetId, cellId,
}: {
  tableId: string | undefined; columnGroupId: ColumnGroupId; datasetId: DatasetId; cellId: CellId;
}) => ({
  /** Corresponds to the CSS grid property "place-self" and is used for vertical and horizontal
   * alignment of the cell. Please note that if the height or width of the cell is to be calculated
   * automatically, this value must not be "stretch"! */
  placeSelf?: React.CSSProperties['placeSelf'];
  /** Corresponds to the CSS grid property "align-self" and is used for vertical alignment of the
   * cell. Please note that if the cell is placed in a row whose height is to be calculated
   * automatically, this value must not be "stretch"!*/
  alignSelf?: React.CSSProperties['alignSelf'];
  /** Corresponds to the CSS grid property "justify-self" and is used for horizontal alignment of
   * the cell. Please note that if the cell is placed in a column whose width is to be calculated
   * automatically, this value must not be "stretch"! */
  justifySelf?: React.CSSProperties['justifySelf'];
  /** Corresponds to the CSS property "text-align" and is used to align the text in the cell
   * horizontally. Using this field makes sense if the text in the cell wraps, since field
   * "justifySelf", for example, would only align the content of the cell as a whole. */
  textAlign?: React.CSSProperties['textAlign'];
  /** This field can be used to assign a defined background color to the cell. It results as an
   * inline style in the CSS property "background". This setting is only available for simple data
   * cells (see field "content"). */
  backgroundColor?: ColorKeys;
  /** This field can be used to change the font size of the cell content. The typographical sizes
   * "xl" and "xxl" are not intended for data cells and are therefore not offered here. This setting
   * is only available for simple data cells (see field "content"). */
  valueSize?: keyof Pick<typeof typo.fontSize, 'small' | 'normal' | 'large'>;
  /** This field can be used to change the text color of the cell content. It results in an inline
   * style in the CSS property "color". This setting is only available for simple data cells (see
   * field "content"). */
  valueColor?: keyof Pick<Color, 'attention' | 'attentionHigh' | 'signalOk' | 'signalWarning' | 'signalError'>;
  /** If we set this value to true, the text in the cell will be displayed as disabled. This setting
   * is only available for simple data cells (see field "content"). */
  disabled?: boolean;
  /** If this field is set, the cell is a header cell with this content as label. */
  label?: string | number;
  /** By setting this field at header cells (see field "label"), corresponding arrows are displayed
   * in the cell to indicate the sort order of the column. Please note that the records must be
   * sorted outside the data table component. This field is for visualization purposes only and has
   * no effect on the display of the records. */
  sortOrder?: 'asc' | 'desc';
  /** If the cell is to be a simple data cell, the cell content must be given to this field
   * exclusively as text or as a number. For complex data cells, a React component can be given
   * instead, which can of course contain further subcomponents. */
  content?: React.ReactNode;
  /** If a function is assigned to this optional field, it will be called when the cell is
   * clicked. At header cells, it can be used to sort the the columns for example. */
  onClick?: ({
    tableId, columnGroupId, datasetId, cellId, event,
  }: {
    tableId: string | undefined; columnGroupId: ColumnGroupId; datasetId: DatasetId; cellId: CellId; event: React.MouseEvent<HTMLDivElement>;
  }) => void;
} | undefined);


/** Type of a function to get the content and meta information about a partial dataset. */
export type DatasetPartIterator = ({
  tableId, columnGroupId, datasetId,
}: {
  tableId: string | undefined; columnGroupId: ColumnGroupId; datasetId: DatasetId;
}) => {
  /** This mandatory and memorized function is called for each cell of the partial dataset that is
   * rendered to get the content and meta information about the cell of the partial dataset.*/
  cellIterator: CellIterator;
  /** By setting this optional boolean field to true, the sub-dataset is given a different
   * background color so that it is displayed as focused. Please note: if the following field
   * "backgroundColor" is set, "hasFocus" has no effect. */
  hasFocus?: boolean;
  /** Optionally, an alternative background color for the sub-dataset can be passed here. By
   * default, the color of each sub-dataset is set to "offWhite". */
  backgroundColor?: ColorKeys;
  /** A function can be passed to this optional field, which is called when the partial data set is
   * clicked. As argument an object with the following fields is passed: "tableId" for the optional
   * ID of the data table, "columnGroupId" with the ID of the column group, "datasetId" with the ID
   * of the dataset and the event object. */
  onClick?: ({
    tableId, columnGroupId, datasetId, event,
  }: {
    tableId: string | undefined; columnGroupId: ColumnGroupId; datasetId: DatasetId; event: React.MouseEvent<HTMLDivElement>;
  }) => void;
};


export interface DataTableHandle {
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollOneDatasetUp: () => void;
  scrollOneDatasetDown: () => void;
  scrollPageUp: () => void;
  scrollPageDown: () => void;
}


/** The props of the React component of the layout component "DataTable". */
export interface DataTableProps extends DataTableStylingProps {
  /** The React reference of an imperative handle of the data table component. */
  readonly ref?: React.Ref<DataTableHandle | null>;
  /** Optionally, an ID for the HTML attribute "id" of the data table, written in every build - for
   * example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** Optionally, the ID of the tab a tab bar switches this data table with (see the prop "id" of
   * the tab items of "TabBar"). It writes two ARIA attributes at once: the data table's role
   * becomes "tabpanel", and "aria-labelledby" names that tab, so that a screen reader reading the
   * data table says which tab it belongs to. The tab states the other direction through its prop
   * "panelId", which takes this data table's own "id" - one of the two without the other leaves
   * the pair half spoken. */
  readonly tabBarItemId?: string;
  readonly columns: TablePreparerProps['columns'];
  readonly datasetLayout: TablePreparerProps['datasetLayout'];
  readonly freezedColumnGroupIds?: Required<TablePreparerProps>['freezedColumnGroupIds'];
  readonly columnGroupIds?: Required<TablePreparerProps>['columnGroupIds'];
  readonly freezedDatasetIds?: Required<TablePreparerProps>['freezedDatasetIds'];
  readonly datasetIds?: Required<TablePreparerProps>['datasetIds'];
  readonly activeDatasetId?: Required<TablePreparerProps>['activeDatasetId'];
  readonly areDatasetsBefore?: Required<TablePreparerProps>['areDatasetsBefore'];
  readonly areDatasetsAfter?: Required<TablePreparerProps>['areDatasetsAfter'];
  /** The data table calls this mandatory callback prop for each partial dataset that is to be
   * rendered to get the content and some meta information about this partial dataset. */
  readonly datasetPartIterator: DatasetPartIterator;
  readonly stayOnTop?: Required<TablePreparerProps>['stayOnTop'];
  readonly resetTable?: Required<TablePreparerProps>['resetTable'];
  readonly expandTableTopBottomFactor?: Required<TablePreparerProps>['expandTableTopBottomFactor'];
  readonly expandTableLeftRightFactor?: Required<TablePreparerProps>['expandTableLeftRightFactor'];
  readonly defaultColumnWidth?: Required<TablePreparerProps>['defaultColumnWidth'];
  readonly defaultRowHeight?: Required<TablePreparerProps>['defaultRowHeight'];
  readonly columnGap?: Required<TablePreparerProps>['columnGap'];
  readonly datasetPaddingLeft?: Required<TablePreparerProps>['datasetPaddingLeft'] | 0;
  readonly datasetPaddingRight?: Required<TablePreparerProps>['datasetPaddingRight'] | 0;
  readonly defaultAverageDatasetHeight?: Required<TablePreparerProps>['defaultAverageDatasetHeight'];
  readonly smoothScrolling?: Required<TablePreparerProps>['smoothScrolling'];
  /** This prop allows the vertical scroll bar to be placed at the horizontal start position of the
   * table instead of at the end position. For right-to-left languages, this would be to the left of
   * the table instead of to the right. */
  readonly verticalScrollBarHandleAtStartDir?: boolean;
  /** This prop allows the vertical scroll bar to be placed outside the table. By default, it is
   * displayed inside the table, placing it above the datasets. */
  readonly verticalScrollBarHandleOutside?: boolean;
  /** This prop allows the horizontal scroll bar to be placed outside the table. By default, it is
   * displayed inside the table, which means it is positioned above the datasets. */
  readonly horizontalScrollBarHandleOutside?: boolean;
  /** If this prop is set to true, navigation buttons are displayed above and below the vertical
   * scroll bar as soon as the props "areDatasetsBefore" and "areDatasetsAfter" are set to true.
   * Note that the top button is never displayed if the prop "stayOnTop" is set to true. Pressing
   * one of these buttons will trigger a call of the callback prop "onRequestDatasets" with the
   * values "top" or "bottom". */
  readonly showNaviButtons?: boolean;
  /** The navigation buttons (see prop "showNaviButtons") are always aligned horizontally in the
   * center of the scrollbar. Vertically, they are aligned with the top or bottom edge of the table
   * and can be moved inward or outward (negative value) using this prop. */
  readonly naviButtonsVerticalOffset?: number;
  /** Callback prop to request datasets: when it is called, and what its fields "pos" and
   * "averageNumVisibleDatasets" say, is described at the prop of the same name of the helper
   * component "TablePreparer". */
  readonly onRequestDatasets?: Required<TablePreparerProps>['onRequestDatasets'];
}


export interface PropsForContext {
  tableId?: DataTableProps['id'];
  datasetPartIterator?: DataTableProps['datasetPartIterator'];
  columnGap?: DataTableProps['columnGap'];
  datasetPaddingLeft?: DataTableProps['datasetPaddingLeft'];
  datasetPaddingRight?: DataTableProps['datasetPaddingRight'];
}
