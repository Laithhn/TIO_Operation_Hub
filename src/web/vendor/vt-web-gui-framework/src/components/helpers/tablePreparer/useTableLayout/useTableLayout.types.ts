import type {
  CellMeasurerData, CellMetaData, ColumnGroupId, DatasetId, DatasetLayoutId, Row, TablePreparerProps,
} from '../tablePreparer.types';


export interface DeriveColumnGroupResult {
  /** The total number of columns of a column group. */
  numColumns: number;
  /** Array with elements of each column of the column group. If the column is not visible, the
   * element is null. If it is visible, the element is an object with the dimension of the column
   * and the information if the dimension has to be measured or not. The length of the array is
   * equal to the value of field "numColumns". */
  columnWidths: ({ dim: number; measure: boolean | 'min-content' } | null)[];
  /** The number of columns of a column group, that are visible. The value is greater than or equal
   * 0 and smaller than or equal the value of field "numColumns". It is also the same as the number
   * of elements in field "columnWidths", that are not null. */
  numVisibleColumns: number;
  /** Array with the zero based indexes of the columns of a column group that are visible. These are
   * also the indexes of the elements in field "columnWidth" that are not null. The length of this
   * array is the same as the value of field "numVisibleColumns". */
  visibleColumnIdxs: number[];
  /** If this field is set to true, the column group is terminated by a vertical line after its last
   * column. */
  endLine: boolean;
}


export interface DeriveDatasetResult {
  /** The unique ID of the dataset leyout. */
  datasetLayoutId: DatasetLayoutId;
  /** The total number of rows of the dataset. */
  numRows: number;
  /** Array with elements of each row of the dataset. If the row is not visible, the element is
   * null. If it is visible, the element is an object with the dimension of the row and the
   * information if the dimension has to be measured or not. The length of the array is equal to the
   * value of field "numRows". */
  rowHeights: ({ dim: number; measure: boolean | 'min-content' } | null)[];
  /** The number of rows of a dataset, that are visible. The value is greater than or equal 0 and
   * smaller than or equal the value of field "numRows". It is also the same as the number of
   * elements in field "rowHeights", that are not null. */
  numVisibleRows: number;
  /** Array with the zero based indexes of the rows of a dataset that are visible. These are also
   * the indexes of the elements in field "rowHeights" that are not null. The length of this array
   * is the same as the value of field "numVisibleRows". */
  visibleRowIdxs: number[];
  /** Array with the cell information of each visible row. The length of the array is equal to the
   * value of field "numVisibleRows". */
  visibleRowCells: Row['cells'][];
  /** The additional space in pixels, added below of the dataset. */
  addHeight: number;
  /** True, if the dataset has a line below. */
  bottomLine: boolean;
}


export interface DeriveCellsResult {
  datasetLayoutId: DatasetLayoutId;
  gridTemplateAreas: string;
  cellsMetaData: CellMetaData[];
}


export interface UseTableLayoutProps {
  readonly columns: TablePreparerProps['columns'];
  readonly datasetLayout: TablePreparerProps['datasetLayout'];
  readonly defaultColumnWidth: TablePreparerProps['defaultColumnWidth'];
  readonly defaultRowHeight: TablePreparerProps['defaultRowHeight'];
  readonly columnGap: TablePreparerProps['columnGap'];
  readonly defaultAverageDatasetHeight: TablePreparerProps['defaultAverageDatasetHeight'];
}


export interface UseTableLayoutResult {
  getDatasetHeights: (datasetId: DatasetId) => { heights: (number | null)[]; totalHeight: number; gridTemplateRows: string };
  getColumnGroupWidths: (columnGroupId: ColumnGroupId) => { widths: (number | null)[]; totalWidth: number; gridTemplateColumns: string };
  getGridTemplateAreas: (columnGroupId: ColumnGroupId, datasetId: DatasetId) => string;
  getCellsMetaData: (columnGroupId: ColumnGroupId, datasetId: DatasetId) => CellMetaData[];
  hasEndLine: (columnGroupId: ColumnGroupId) => boolean;
  hasBottomLine: (datasetId: DatasetId) => boolean;
  getAverageHeightOfAllDatasets: () => number;
  setFirstAndLastVisibleColumns: (columnGroupId: ColumnGroupId, firstVisibleColumnIdx?: null | number, lastVisibleColumnIdx?: number) => void;
  setCellHeight: NonNullable<CellMeasurerData['setCellHeight']>;
  setCellWidth: NonNullable<CellMeasurerData['setCellWidth']>;
}
