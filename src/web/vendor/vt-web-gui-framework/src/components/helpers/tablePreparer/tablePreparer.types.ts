import type { SpaceKeys } from 'assets/styles';


export type ColumnGroupId = string;
export type DatasetLayoutId = string;
export type DatasetId = string | number;
export type CellId = string;

export type ShiftTable = 'toTop' | 'toBottom' | 'oneDatasetUp' | 'oneDatasetDown' | 'pageUp' | 'pageDown' | undefined;


/** Settings of a single column of a column group.
 *
 * @example
 * ```typescript
 * // Column with a fix width of 40 pixels. The column is already visible and listet in columns
 * // selection card (if used), but is not clickable there.
 * { width: 40, selection: 'disabled' }
 *
 * // The width of this column is calculated automatically with a minimum width of 40 pixels. The
 * // column is listet in the column selection card (if used).
 * { width: 40, autoWidth: true }
 *
 * // The width of this column is calculated automatically. As minimum width, the value of prop
 * // "defaultColumnWidth" is taken. The column is already visible and listet in the columns
 * // selection card. Clicking it there, the 3rd column is set together with this column to be
 * // visible or not.
 * { autoWidth: true, selection: [3] }
 *
 * // Column with a fix width of 80 pixels. This column is not listet in the columns selection box
 * // (if used).
 * { width: 80, selection: hidden }
 *
 * // Column with a fix width with the value of prop "defaultColumnWidth" but it is not visible at
 * // the moment. This column is listed in the columns selection card (if used).
 * { hidden: true }
 * ``` */
export interface Column {
  /** The optional width of the column in pixels. If no width is specified, the default width is
   * taken (see prop "defaultColumnWidth" of TablePreparerProps). */
  width?: number;
  /** If this field is set to true or "auto", the width of the column is calculated automatically
   * based on its content. The value "minContent" or "min-content" also results in an automatic
   * calculation, but shrinks the column to its smallest possible width without causing avoidable
   * overflow of its content. Hereby the text content is wrapped. For the values true, "auto",
   * "minContent" and "min-content", the column width specified in field "width" or the default
   * width are taken as the minimum width. The default value of this field is false. */
  autoWidth?: boolean | 'auto' | 'minContent' | 'min-content';
  /** If this field is set to true, the column is hidden. Cells that span only such columns are not
   * rendered. Default value: false. */
  hidden?: boolean;
  /** This optional field sets the column selection options for the column selection card component
   * <ColumnsSelectionCard>. If the selection value of a column is "disabled", the column is
   * displayed in the column selection card but cannot be set as visible or not. If the value is
   * "hidden", the column is not listed in the card and therefore cannot be set as visible or not.
   * If an array with zero-based column indexes is passed, these columns will additionally be set as
   * visible or not, even if their own selection value is "hidden" (but not "disabled"). */
  selection?: 'disabled' | 'hidden' | number[];
}


/** Settings of a group of columns. */
export interface ColumnGroup {
  /** Array of the columns of the group. Note that an array must always be given, but it can be
   * empty. */
  columns: Column[];
  /** If this field is set to true, the column group is terminated by a vertical line after its last
   * column. Default value: false. */
  endLine?: boolean;
  /** By default, the column group as a whole and its individual columns can be selected in the
   * columns selection card component <ColumnsSelectionCard>. If this field is set to "disabled",
   * the headline of the column group is displayed without the option to select. The individual
   * columns of the group can be selected individually as usual. If set to "hidden", the entire
   * column group and its columns are not displayed in the column selection card. */
  selection?: 'disabled' | 'hidden';
}


/** Settings of a single row of a dataset layout. */
export interface Row {
  /** The optional height of the row. If no height is specified, a default height is taken for the
   * row, see "defaultRowHeight" of TablePreparerProps. */
  height?: number;
  /** If this field is set to true or "auto", the row height is determined automatically. The value
   * specified under "height" serves as the minimum height. Default value: false. */
  autoHeight?: boolean | 'auto' | 'minContent' | 'min-content';
  /** If this field is set to true, the row is hidden. Default value: false. */
  hidden?: boolean;
  /** The cell IDs have to be given in an array as value of this field. The single IDs must be of
   * type string and must be unique within a dataset layout. An empty string is translated into "."
   * (see CSS grid areas), which means an empty cell. If a cell spans multiple columns or rows, its
   * ID must be set multiple times accordingly. You can also write "repeat(<n>, <id>)" to set an ID
   * n times in the row. It should be noted that such a cell must always be rectangular. If multiple
   * column groups are used, the array with the cells is used for each column group. Alternatively,
   * a function can be passed here instead of an array, passing the ID of the column group and that
   * of the dataset layout as arguments. The corresponding array with the cell IDs must be returned.
   * The IDs only need to be unique within the dataset part of the column group. */
  cells: CellId[] | ((columnGroupId: ColumnGroupId, datasetLayoutId: DatasetLayoutId) => CellId[]);
}


/** Settings for a dataset layout, consists of no, one or multiple rows.
 *
 * @example
 * ``` typescript
 * {
 *   id: 'myLayout',
 *   rows:[
 *     { height: space.normal, cells: ['c1', 'repeat(2, c2)', 'c3'] },
 *     { autoHeight: true, cells: ['c1', 'c2', 'c2', '.', 'c4'] },
 *   ],
 *   addHeight: 'small',
 *   noBottomLine: true,
 * }
 * ```
 * The first row in the example above has a fixed height, while the height of the second row is
 * automatically calculated for each dataset depending on its content. Cell "c1" spans both rows,
 * cell "c2" also spans both rows and additionally the second and third columns. "repeat(2, c2)" is
 * cell magic, which can be used to express a repeating cell specification. If the number of columns
 * (see prop "columns") is smaller than the number of cells, the latter are truncated accordingly.
 * If there are more columns than cells, the missing cells are filled with the IDs of the last cells
 * (here "c3" and "c4"). Empty cells can be placed with ".". The data records that use this layout
 * are not terminated with a bottom line as usual, but instead with a blank space of the given
 * height. */
export interface DatasetLayout {
  /** The unique ID of the dataset leyout. */
  id: DatasetLayoutId;
  /** Array of the rows of the dataset layout. Note that an array must always be given, but it can
   * be empty. */
  rows: Row[];
  /** This allows you to set an additional empty space below the dataset. Default value: 0. */
  addHeight?: SpaceKeys;
  /** If this flag is set to true, the dataset is not terminated with a bottom line. Default value:
   * false. */
  noBottomLine?: boolean;
}


export interface CellMetaData {
  /** The ID of the cell. */
  cellId: CellId;
  /** The zero based index of the first row, the cell spans. This is the original index considering
   * all rows. */
  startRowIdx: number;
  /** The zero based index of the last row, the cell spans. This is the original index considering
   * all rows. */
  endRowIdx: number;
  /** The zero based index of the first column, the cell spans. This is the original index
   * considering all coliumns. */
  startColumnIdx: number;
  /** The zero based index of the last column, the cell spans. This is the original index
   * considering all coliumns. */
  endColumnIdx: number;
  /** True, if the height of this cell has to be measured. */
  measureHeight: boolean;
  /** True, if the width of this cell has to be measured. */
  measureWidth: boolean;
}


export interface CellMeasurerData {
  setCellHeight?: (columnGroupId: ColumnGroupId, datasetId: DatasetId, cellId: CellId, startRowIdx: number, endRowIdx: number, height: number) => void;
  setCellWidth?: (columnGroupId: ColumnGroupId, datasetId: DatasetId, cellId: CellId, startColumnIdx: number, endColumnIdx: number, width: number) => void;
}


export interface TablePreparerHandle {
  scroll: (shiftTable: ShiftTable) => void;
  requestDatasets: (pos: 'initial' | 'top' | 'bottom' | 'before' | 'after') => void;
}


export interface DatasetPartOfColumnGroup {
  columnGroupId: ColumnGroupId;
  datasetId: DatasetId;
  posX: number;
  posY: number;
  height: number;
  gridTemplateRows: string;
  gridTemplateColumns: string;
  gridTemplateAreas: string;
  topLine?: boolean;
  bottomLine?: boolean;
  endLine: boolean;
  cellsMetaData: CellMetaData[];
}


export interface ParamsForTable {
  estScrollLeft: number;
  estScrollWidth: number;
  estScrollTop: number;
  estScrollHeight: number;
  isScrollMovementX: boolean;
  isScrollMovementY: boolean;
  translateX: number;
  translateY: number;
  freezedColumnGroupsWidth: number;
  freezedDatasetsTopHeight: number;
  freezedDatasetsBottomHeight: number;
  freezedDatasetPartsOfFreezedColumnGroups: DatasetPartOfColumnGroup[];
  freezedDatasetPartsOfScrollableColumnGroups: DatasetPartOfColumnGroup[];
  datasetPartsOfFreezedColumnGroups: DatasetPartOfColumnGroup[];
  datasetPartsOfScrollableColumnGroups: DatasetPartOfColumnGroup[];
}


export interface LeadDatasetData {
  id: DatasetId | undefined;
  idx: number | null;
  posY: number;
}


export interface ScrollContrData {
  translateX: number;
  translateY: number;
  prevSetY: {
    timestamp: number;
    remainingScrollDist: number;
  };
}


export interface PrevsData {
  scrollDistX: number;
  scrollDistY: number;
  activeDatasetId: DatasetId | null;
  resetTable: unknown;
  veryFirstDatasetId: DatasetId | null;
  veryLastDatasetId: DatasetId | null;
  deriveParamsForTable: ((shiftTable?: ShiftTable) => void) | null;
}


/** The props of the React component of the helper component "TablePreparer". */
export interface TablePreparerProps {
  /** The React reference of an imperative handle of the table preparer component. */
  readonly ref?: React.Ref<TablePreparerHandle | null>;
  /** The width of the container in which the table preparer is embedded and which it fills
   * completely. */
  readonly tableWidth?: number;
  /** The height of the container in which the table preparer is embedded and which it fills
   * completely. */
  readonly tableHeight?: number;
  /** The absolute horizontal scrolling distance in pixels to scroll the non-fixed columns. An
   * increasing value means scrolling to the right. */
  readonly scrollDistX?: number;
  /** The absolute vertical scrolling distance in pixels to scroll the non-fixed datasets. An
   * increasing value means scrolling down. */
  readonly scrollDistY?: number;
  /** This prop defines the column layout. Depending on its complexity and requirements, this can be
   * done in two ways: in the simplest case, you pass an array with the corresponding fields for
   * each existing column. In more complex applications, especially when column groups are used, a
   * function can also be passed to prop "columns". This function receives the ID of a column group
   * and has to be return the column layout of this group. This can be an array of columns or a
   * special object with additional data of the column group. A new identity derives the whole table
   * anew. */
  readonly columns: Column[] | ((columnGroupId: ColumnGroupId) => (Column[] | ColumnGroup));
  /** Using this prop, the table preparer queries the dataset layout for the respective dataset. An
   * object can be passed directly to it, as long as there is only one dataset layout that is to be
   * used by all datasets. Alternatively, the prop can also be passed a function that receives the
   * ID of the dataset as an argument. The corresponding layout object must then be returned. A new
   * identity derives the whole table anew. */
  readonly datasetLayout: DatasetLayout | ((datasetId: DatasetId) => DatasetLayout);
  /** This prop can be used to optionally specify the IDs of column groups that should be displayed
   * fixed at the top of the table. The position of these column groups does not change when
   * scrolling horizontally. A new identity derives the whole table anew. */
  readonly freezedColumnGroupIds?: ColumnGroupId[];
  /** If certain columns are to be grouped together, the IDs of these column groups can be entered
   * here. If the table is wider than the available space, you can scroll horizontally across these
   * column groups. If no column groups are specified here or in the prop "freezedColumnGroupIds",
   * all columns are automatically assigned internally to a non-fixed column group "CG0". A new
   * identity derives the whole table anew. */
  readonly columnGroupIds?: ColumnGroupId[];
  /** In this prop, the IDs of the dataset that are to be displayed fixed at the top of the table
   * can be listed as an array. The position of these datasets does not change when scrolling
   * vertically. Usually, the ID of the header row and possibly those of other fixed rows, e.g.,
   * with fields for filtering, are entered here. Alternatively, this prop can also be passed an
   * object that can contain the two optional fields "top" and "bottom". The values of these fields
   * are again arrays with dataset IDs. Those listed under "top" are displayed fixed at the top of
   * the table as described above. With "bottom", it is also possible to display data records fixed
   * at the bottom of the table. A new identity derives the whole table anew. */
  readonly freezedDatasetIds?: DatasetId[] | { top?: DatasetId[]; bottom?: DatasetId[] };
  /** This array lists the IDs of the existing datasets in the order they are sorted. A new identity
   * derives the whole table anew. */
  readonly datasetIds?: DatasetId[];
  /** The ID of an active dataset can be specified here as an option. If the dataset with this ID is
   * rendered, the vertical scroll offset is automatically adjusted under certain conditions so that
   * this dataset is fully visible. */
  readonly activeDatasetId?: DatasetId | null;
  /** If there are additional datasets before the datasets listed in the prop "datasetIds", e.g., in
   * a database on a server, this prop must be set to true accordingly. This ensures that when
   * scrolling through the datasets and approaching the top of the table, the callback prop
   * "onRequestDatasets" is automatically called. The field "pos" of the argument of this function
   * is set to "before" in this case. Default value: false. */
  readonly areDatasetsBefore?: boolean;
  /** If there are additional datasets after the datasets listed in the prop "datasetIds", e.g., in
   * a database on a server, this prop must be set to true accordingly. This ensures that when
   * scrolling through the datasets and approaching the bottom of the table, the callback prop
   * "onRequestDatasets" is automatically called. The field "pos" of the argument of this function#
   * is set to "after" in this case. Default value: false. */
  readonly areDatasetsAfter?: boolean;
  /** If new datasets are added to the beginning of the prop "datasetIds" while this prop is set to
   * true and the table is simultaneously at its top vertical scroll position, the view will
   * automatically scroll to the beginning after the records are added. Default value: false. */
  readonly stayOnTop?: boolean;
  /** Any value can be passed to this prop. If this value changes (shallow compare), the
   * calculations and stored values in the table are reset and recalculated. This is useful, for
   * example, if the sort order of the datasets jchanges or if the same table is to be used for
   * different datasets. Default value: null. */
  readonly resetTable?: unknown;
  /** The data table only renders those datasets from array "datasetIds" that are actually visible
   * on the screen, depending on the scroll position. To ensure that the initial rendering (adding)
   * of the datasets remains as invisible as possible when scrolling, the height of the table to be
   * taken into account can be expanded upwards and downwards using this factor. The value refer to
   * the height of the table. If, for example, the table is 500 pixels high and this factor is 0.3,
   * the table preparer will also render datasets 150 pixels above and below the table invisibly.
   * Default value: false. */
  readonly expandTableTopBottomFactor?: number;
  /** The data table only renders those columns from prop "columns" that are actually visible on the
   * screen, depending on the scroll position. To ensure that the initial rendering (added) of the
   * columns remains as invisible as possible when scrolling, the width of the table to be taken
   * into account can be expanded to the left and to the right using this factor. The value refer to
   * the width of the table. If, for example, the table is 500 pixels wide and this factor is 0.3,
   * the table preparer will also render datasets 150 pixels beside the table invisibly. Default
   * value: false. */
  readonly expandTableLeftRightFactor?: number;
  /** If no fixed width is specified for a column in a column layout, the default width specified
   * here is used instead. Default value: 0. */
  readonly defaultColumnWidth?: number;
  /** If no fixed height is specified for a row in a dataset layout, the default height specified
   * here is used instead. Default value: 0. */
  readonly defaultRowHeight?: number;
  /** This prop can be used to set a fixed distance between the columns of a column group. Default
   * value: 0. */
  readonly columnGap?: SpaceKeys;
  /** With these prop, all partial datasets automatically receive a left margin before the first
   * column. Default value: 0. */
  readonly datasetPaddingLeft?: SpaceKeys;
  /** With these prop, all partial datasets automatically receive a right margin after the last
   * column. Default value: 0. */
  readonly datasetPaddingRight?: SpaceKeys;
  /** The table preparer continuously calculates the average height of all datasets. This value
   * affects the corresponding field when calling the callback prop "onRequestDatasets". Since no
   * information about the average height of the datasets is available during the initial rendering,
   * this default value is used instead. Default value: 0. */
  readonly defaultAverageDatasetHeight?: number;
  /** This prop enables smooth scrolling when scrolling horizontally and vertically, making it
   * easier for the eye to follow the data. However, very fast vertical scrolling can cause display
   * problems, as data records may not be shown and hidden in time. Default value: false. */
  readonly smoothScrolling?: boolean;
  /** This callback function is called in various cases to request datasets from
   * the content:
   * 1. initial after the table has been rendered for the first time or after a reset (see prop
   * "resetTable"), if no dataset IDs from prop "datasetIds" have been passed at this point. The
   * field "pos" of the argument passed to the function in this case is "initial".
   * 2. if the prop "areDatasetsBefore" is set to true and the table with the datasets in
   * "datasetIds" approaches the top edge when scrolling. The field "pos" of the argument passed to
   * the function in this case is "before".
   * 3. similar to the second case, but when the table approaches the bottom while scrolling and the
   * prop "areDatasetsAfter" is set to true. The field "pos" of the argument passed to the function
   * in this case is "after".
   * 4. when the top navigation button is pressed, see prop "showNaviButtons". The field "pos" of
   * the argument in this case is "top".
   * 5. similar to before, but when the bottom navigation button is pressed, see prop
   * "showNaviButtons". The field "pos" of the argument in this case is "bottom".
   * 6. this prop is called when the handle method "requestDatasets" is called from outside. The
   * field "pos" of the argument is taken from the method.
   *
   * Field "averageNumVisibleDatasets" of the argument passed to this function is the estimated
   * number of datasets that can be displayed in the table. See also the description of the prop
   * "defaultAverageDatasetHeight". */
  readonly onRequestDatasets?: ({ pos, averageNumVisibleDatasets }: { pos: 'initial' | 'top' | 'bottom' | 'before' | 'after'; averageNumVisibleDatasets: number }) => void;
  /** The table preparer returns a function with all parameters that are needed to build the data
   * table. */
  readonly children: (paramsForTable: ParamsForTable) => React.ReactNode;
}
