import { useCallback, useRef } from 'react';

import { space } from 'assets/styles';
import { isNonEmptyString, isNumber } from 'utils/type';

import type {
  CellId, CellMetaData, Column, ColumnGroup, ColumnGroupId, DatasetId, DatasetLayout, Row,
} from '../tablePreparer.types';

import { useCache } from './useCache/useCache';
import { useDimensions } from './useDimensions/useDimensions';
import type {
  DeriveCellsResult, DeriveColumnGroupResult, DeriveDatasetResult, UseTableLayoutProps,
  UseTableLayoutResult,
} from './useTableLayout.types';


/**
 * Function to build the unique cell ID by the given column group ID, dataset ID and by the cell ID
 * of the used dataset layout.
 */
const ucidMapper = (columnGroupId: ColumnGroupId, datasetId: DatasetId, cellId: CellId) => `${columnGroupId}.${datasetId}.${cellId}`;


/**
 * React hook to handle the complete data table layout, consisting of column groups with columns,
 * datasets with rows and cells.
 *
 * Its functions keep their useCallback, and so do those of useDimensions and useCache it builds on.
 * The function deriveParamsForTable of the TablePreparer depends on them, and the TablePreparer
 * derives the whole table anew whenever that function's identity changes - a layout effect compares
 * it. A function created anew here would start that derivation on every render.
 */
const useTableLayout = ({
  columns, datasetLayout, defaultColumnWidth, defaultRowHeight, columnGap, defaultAverageDatasetHeight,
}: UseTableLayoutProps): UseTableLayoutResult => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const visibleColumnIdxsRef = useRef<Record<ColumnGroupId, { firstIdx: number; lastIdx: number } | undefined | null>>({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const defColWidth = isNumber(defaultColumnWidth, { withoutInfinite: true, gte: 0 })
    ? defaultColumnWidth
    : 0;

  const defRowHeight = isNumber(defaultRowHeight, { withoutInfinite: true, gte: 0 })
    ? defaultRowHeight
    : 0;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const { cache: columnGroupCache } = useCache();
  const { cache: datasetCache } = useCache();
  const { cache: datasetLayoutCache } = useCache();
  const { cache: cellsCache } = useCache();
  const { cache: cellsInnerCache } = useCache();
  const { cache: cellsMetaDataCache } = useCache();


  /**
   * Helper function to return cached information about the columns of a column
   * group. The information will be derived from the given props "columns" and "defaultColumnWidth"
   * for each column group. Note that there is no double caching: the same given columns can be
   * assigned to several column groups, but these column arrays have no ID to differentiate them.
   * And column groups usually do not occur as often as datasets. So the resulted and returned
   * column information are derived new for every column group.
   */
  const deriveColumnGroup = useCallback((columnGroupId: ColumnGroupId): DeriveColumnGroupResult => columnGroupCache(
    columnGroupId,
    [
      (typeof columns === 'function') ? columns(columnGroupId) : columns,
      defColWidth,
    ],
    (_, cachedColumns: Column[] | ColumnGroup, cachedDefColWidth: number) => {
      const columnWidths: DeriveColumnGroupResult['columnWidths'] = [];
      const visibleColumnIdxs: number[] = [];
      let endLine = false,
        colArr: Column[];

      if (Array.isArray(cachedColumns)) {
        colArr = cachedColumns;
      } else {
        colArr = cachedColumns.columns;
        endLine = (cachedColumns.endLine === true);
      }

      for (let colIdx = 0; colIdx < colArr.length; colIdx++) {
        const { width, autoWidth, hidden } = colArr[colIdx]!;

        if (hidden === true) {
          columnWidths.push(null);
        } else {
          visibleColumnIdxs.push(colIdx);

          const dim = isNumber(width, { withoutInfinite: true, gte: 0 }) ? width : cachedDefColWidth;
          let measure: boolean | 'min-content';

          switch (autoWidth) {
            case true:
            case 'auto': measure = true; break;
            case 'minContent':
            case 'min-content': measure = 'min-content'; break;
            default: measure = false; break;
          }

          columnWidths.push({ dim, measure });
        }
      }

      return {
        numColumns: colArr.length,
        columnWidths,
        numVisibleColumns: visibleColumnIdxs.length,
        visibleColumnIdxs,
        endLine,
      };
    },
  ), [columns, defColWidth, columnGroupCache]);


  /**
   * Helper function to return double cached information about a dataset and its
   * rows. The information will be derived from the given props "datasetLayout" and
   * "defaultRowHeight" for each dataset. But there is a double caching, because typically a large
   * number of datasets are using a small number of dataset layouts.
   */
  const deriveDataset = useCallback((datasetId: DatasetId): DeriveDatasetResult => datasetCache(
    datasetId,
    [
      (typeof datasetLayout === 'function') ? datasetLayout(datasetId) : datasetLayout,
      defRowHeight,
    ],
    (_, cachedDatasetLayout: DatasetLayout, cachedDefRowHeight: number) => datasetLayoutCache(
      cachedDatasetLayout.id,
      [cachedDatasetLayout, cachedDefRowHeight],
      (
        __,
        {
          id, rows, addHeight, noBottomLine,
        }: DatasetLayout,
        doubleCachedDefRowHeight: number,
      ) => {
        const rowHeights: DeriveDatasetResult['rowHeights'] = [];
        const visibleRowIdxs: number[] = [];
        const visibleRowCells: Row['cells'][] = [];
        const bottomLine = !noBottomLine;

        for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
          const {
            height, autoHeight, hidden, cells,
          } = rows[rowIdx]!;

          if (hidden === true) {
            rowHeights.push(null);
          } else {
            visibleRowIdxs.push(rowIdx);
            visibleRowCells.push(cells);

            const dim = isNumber(height, { withoutInfinite: true, gte: 0 }) ? height : doubleCachedDefRowHeight;
            let measure: boolean | 'min-content';

            switch (autoHeight) {
              case true:
              case 'auto': measure = true; break;
              case 'minContent':
              case 'min-content': measure = 'min-content'; break;
              default: measure = false; break;
            }

            rowHeights.push({ dim, measure });
          }
        }

        return {
          datasetLayoutId: id,
          numRows: rows.length,
          rowHeights,
          numVisibleRows: visibleRowIdxs.length,
          visibleRowIdxs,
          visibleRowCells,
          addHeight: (addHeight ? space[addHeight] : 0) + Number(bottomLine),
          bottomLine,
        };
      },
    ),
  ), [datasetLayout, defRowHeight, datasetCache, datasetLayoutCache]);


  /**
   * Helper function to return double cached information about the cells of a
   * dataset for a column group. The information will be derived from the derived columns and
   * dataset layouts above for a given column group ID and a given dataset ID. It is doubled cached
   * because typically a large number of datasets are using the same dataset layout.
   * Note that if there are anywhere changes in any deep dependencies for the given column group and
   * dataset ID (columns, datasetLayout, defaultColumnWidth, defaultRowHeight), all associated cell
   * meta data objects and its enclosing arrays are created new. This is to force rendering and
   * re-measuring of the cells.
   */
  const deriveCells = useCallback((columnGroupId: ColumnGroupId, datasetId: DatasetId): DeriveCellsResult => cellsCache(
    `${columnGroupId}.${datasetId}`,
    [deriveColumnGroup(columnGroupId), deriveDataset(datasetId)],
    (
      _,
      cachedColumns: ReturnType<typeof deriveColumnGroup>,
      cachedDatasetLayout: ReturnType<typeof deriveDataset>,
    ) => cellsInnerCache(
      `${columnGroupId}.${cachedDatasetLayout.datasetLayoutId}`,
      [cachedColumns, cachedDatasetLayout],
      (
        __,
        {
          numColumns, columnWidths, numVisibleColumns, visibleColumnIdxs,
        }: ReturnType<typeof deriveColumnGroup>,
        {
          datasetLayoutId, rowHeights, numVisibleRows, visibleRowIdxs, visibleRowCells,
        }: ReturnType<typeof deriveDataset>,
      ) => {
        if (!numVisibleColumns || !numVisibleRows) {
          return {
            datasetLayoutId,
            gridTemplateAreas: '',
            cellsMetaData: [],
          };
        }

        // Iterate the first time over the visible rows to check and standardize their cells, solve
        // cell magic. After this, allCells is an array of arrays (only for the visible rows) of
        // cell IDs (for every column).

        const modVisibleRowCells = visibleRowCells.map((cells) => {
          let cellsOfRow = (typeof cells === 'function') ? cells(columnGroupId, datasetLayoutId) : cells;

          // Solve cells magic #1: "repeat(num, id)" is allowed to insert a cell ID multile times.
          // Also ensure, that the cell IDs are not empty strings.
          cellsOfRow = cellsOfRow.reduce<CellId[]>((acc, cellId) => {
            if (cellId.startsWith('repeat(')) {
              const { num, multiCellId } = /^repeat\((?<num>\d+),\s*(?<multiCellId>\S+)\s*\)$/.exec(cellId)?.groups ?? {};

              return [
                ...acc,
                ...(new Array<string>((Number(num) > 0) ? Number(num) : 1)).fill(isNonEmptyString(multiCellId) ? multiCellId : '.'),
              ];
            }

            return [
              ...acc,
              cellId || '.',
            ];
          }, []);

          // Solve cells magic #2: fill missing cell IDs with the ID of the last cell or with "." if
          // there aref no cell IDs at all.
          const origLength = cellsOfRow.length;
          if (origLength < numColumns) {
            cellsOfRow.length = numColumns;
            cellsOfRow.fill(cellsOfRow[origLength - 1] ?? '.', origLength);
          }

          return cellsOfRow;
        });

        const consideredCellIds: CellId[] = [];
        const cellsMetaData: CellMetaData[] = [];

        // The collection of the IDs to build gridTemplateAreas are a two-dimensional array. But
        // only the visible columns and rows are considered.
        const idsForTemplate = (new Array(numVisibleRows)).fill(null).map(
          () => (new Array<string>(numVisibleColumns)).fill('.'),
        );

        for (let visibleRowIdx = 0; visibleRowIdx < visibleRowIdxs.length; visibleRowIdx++) {
          const rowIdx = visibleRowIdxs[visibleRowIdx]!;
          const cells = modVisibleRowCells[visibleRowIdx]!;

          for (let visibleColumnIdx = 0; visibleColumnIdx < visibleColumnIdxs.length; visibleColumnIdx++) {
            const columnIdx = visibleColumnIdxs[visibleColumnIdx]!;
            const cellId = cells[columnIdx]!;

            if ((cellId !== '.') && !consideredCellIds.includes(cellId)) {
              const startRowIdx = rowIdx;
              const startColumnIdx = columnIdx;
              let endRowIdx = rowIdx,
                endColumnIdx = columnIdx,
                endVisibleColumnIdx = visibleColumnIdx,
                measureHeight = !!rowHeights[rowIdx]!.measure,
                measureWidth = !!columnWidths[columnIdx]!.measure;

              idsForTemplate[visibleRowIdx]![visibleColumnIdx] = cellId;

              // search after the cell (in the same row) for the same cell ID to expand the column
              // range...
              for (let vcIdx = (visibleColumnIdx + 1); vcIdx < numVisibleColumns; vcIdx++) {
                const cIdx = visibleColumnIdxs[vcIdx]!;
                if (cells[cIdx] === cellId) {
                  endColumnIdx = cIdx;
                  endVisibleColumnIdx = vcIdx;
                  idsForTemplate[visibleRowIdx]![vcIdx] = cellId;

                  if (!measureWidth) {
                    measureWidth = !!columnWidths[cIdx]!.measure;
                  }
                } else {
                  break;
                }
              }

              // search below the cell (in the same column) for the same cell ID to expand the row
              // range...
              for (let vrIdx = (visibleRowIdx + 1); vrIdx < numVisibleRows; vrIdx++) {
                if (modVisibleRowCells[vrIdx]![columnIdx] === cellId) {
                  const rIdx = visibleRowIdxs[vrIdx]!;
                  endRowIdx = rIdx;

                  for (let vcIdx = visibleColumnIdx; vcIdx <= endVisibleColumnIdx; vcIdx++) {
                    idsForTemplate[vrIdx]![vcIdx] = cellId;
                  }

                  if (!measureHeight) {
                    measureHeight = !!rowHeights[rIdx]!.measure;
                  }
                } else {
                  break;
                }
              }

              consideredCellIds.push(cellId);

              cellsMetaData.push({
                cellId,
                startRowIdx,
                endRowIdx,
                startColumnIdx,
                endColumnIdx,
                measureHeight,
                measureWidth,
              });
            }
          }
        }

        return {
          datasetLayoutId,
          gridTemplateAreas: idsForTemplate.map((rowArr) => `"${rowArr.join(' ')}"`).join(' '),
          cellsMetaData,
        };
      },
    ),
  ), [cellsCache, cellsInnerCache, deriveColumnGroup, deriveDataset]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------<editor-fold desc="Hook for the heights">
  // Hook to handle all datasets to measure their cell heights.
  // -----------------------------------------------------------------------------------------------

  const {
    getDimensions: getDatasetHeights,
    getAverageTotalDimension: getAverageHeightOfAllDatasets,
    setCellDimension: setCellHeight,
  } = useDimensions({
    getDefaultDimensions: useCallback(
      (datasetId) => deriveDataset(datasetId).rowHeights,
      [deriveDataset],
    ),

    // getDivisionGap is not used for the datasets

    getAdditionalDimension: useCallback(
      (datasetId) => deriveDataset(datasetId).addHeight,
      [deriveDataset],
    ),

    defaultAverageTotalDimension: defaultAverageDatasetHeight ?? 0,
  });


  //                                                                                  </editor-fold>
  // -------------------------------------------------------<editor-fold desc="Hook for the widths">
  // Hook to handle all column groups to measure their cell widths.
  // -----------------------------------------------------------------------------------------------

  const {
    getDimensions: getColumnGroupWidths,
    // getAverageTotalDimension is not used for the column groups
    setCellDimension: setCellWidth,
  } = useDimensions({
    getDefaultDimensions: useCallback(
      (columnGroupId) => deriveColumnGroup(columnGroupId).columnWidths,
      [deriveColumnGroup],
    ),

    getDivisionGap: useCallback(() => (columnGap ? space[columnGap] : 0), [columnGap]),

    // getAdditionalDimension is not used for the column groups

    // defaultAverageTotalDimension is not used for the column groups
  });


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return {
    /**
     * Function to return the cached heights of the rows of a dataset, selected by
     * the ID of the dataset. Also the total height of the dataset (inclusive gaps) and a joined
     * height string are derived. For all heights that have to be measured,
     * "minmax(<height>px, auto)" or "minmax(<height>px, min-content)" is taken for the joined
     * height string instead of "<height>px".
     */
    getDatasetHeights: useCallback((datasetId: DatasetId) => {
      const { dims, totalDim, joinedDims } = getDatasetHeights(String(datasetId));

      return {
        heights: dims,
        totalHeight: totalDim,
        gridTemplateRows: joinedDims,
      };
    }, [getDatasetHeights]),


    /**
     * Function to return the cached widths of the columns of a group of columns,
     * selected by the ID of the group. Also the total width of the column group (inclusive gaps)
     * and a joined width string are derived. For all widths that have to be measured,
     * "minmax(<width>px, auto)" or "minmax(<width>px, min-content)" is taken for the joined width
     * string instead of "<width>px".
     */
    getColumnGroupWidths: useCallback((columnGroupId: ColumnGroupId) => {
      const { dims, totalDim, joinedDims } = getColumnGroupWidths(columnGroupId);

      return {
        widths: dims,
        totalWidth: totalDim,
        gridTemplateColumns: joinedDims,
      };
    }, [getColumnGroupWidths]),


    /**
     * Function...
     */
    getGridTemplateAreas: useCallback(
      (columnGroupId: ColumnGroupId, datasetId: DatasetId) => deriveCells(columnGroupId, datasetId).gridTemplateAreas,
      [deriveCells],
    ),

    /**
     * Function that returns the meta data of all cells that have to be rendered
     * of a given column group and dataset.
     */
    getCellsMetaData: useCallback((columnGroupId: ColumnGroupId, datasetId: DatasetId) => {
      const { datasetLayoutId, cellsMetaData } = deriveCells(columnGroupId, datasetId);

      return cellsMetaDataCache(
        `${columnGroupId}.${datasetLayoutId}`,
        [
          cellsMetaData,
          visibleColumnIdxsRef.current[columnGroupId],
        ],
        (_, cachedCellsMetaData: CellMetaData[], cachedVisibleColumnIdxs: { firstIdx: number; lastIdx: number } | undefined | null) => {
          if (cachedVisibleColumnIdxs === null) {
            return [];
          }

          if (
            !cachedVisibleColumnIdxs
            || ((cachedVisibleColumnIdxs.firstIdx === 0) && (cachedVisibleColumnIdxs.lastIdx === -1))
          ) {
            return cachedCellsMetaData;
          }

          return cachedCellsMetaData.filter(({ startColumnIdx, endColumnIdx }) => (
            (endColumnIdx >= cachedVisibleColumnIdxs.firstIdx) && (startColumnIdx <= cachedVisibleColumnIdxs.lastIdx)
          ));
        },
      );
    }, [cellsMetaDataCache, deriveCells]),


    /**
     * Function that returns true, if a column group should end with a line.
     */
    hasEndLine: useCallback(
      (columnGroupId: ColumnGroupId) => deriveColumnGroup(columnGroupId).endLine,
      [deriveColumnGroup],
    ),


    /**
     * Function that returns true, if a dataset should end with a bottom line.
     */
    hasBottomLine: useCallback(
      (datasetId: DatasetId) => deriveDataset(datasetId).bottomLine,
      [deriveDataset],
    ),


    /**
     * Returned function to return the average of the total height of all datasets, which
     * dimensions are queried by function getDatasetHeights before.
     */
    getAverageHeightOfAllDatasets,


    /**
     * Function to set the resulted indexes of the first and last visible columns
     * of a column group, selected by the given ID. This function has to be called for every
     * existing columnGroupId before getting the meta data of the visible cells by function
     * getCellsMetaData! If no indexes are given (undefined), all columns are shown.
     *
     * @param columnGroupId - The ID of a group of columns.
     * @param firstVisibleColumnIdx - The resulted index of the first visible column, can be 0 or
     *   greater. Or if it is null, the complete column group is invisible.
     * @param lastVisibleColumnIdx - The resulted index of the last visible column. It can be 0 or
     *   greater or it can be -1 if there is no limit at the end of the columns.
     */
    setFirstAndLastVisibleColumns: useCallback((columnGroupId: ColumnGroupId, firstVisibleColumnIdx?: null | number, lastVisibleColumnIdx?: number) => {
      if (isNumber(firstVisibleColumnIdx, { withoutInfinite: true }) && isNumber(lastVisibleColumnIdx, { withoutInfinite: true })) {
        const firstIdx = Math.max(0, firstVisibleColumnIdx);
        const lastIdx = Math.max(-1, lastVisibleColumnIdx);

        if (
          (firstIdx !== visibleColumnIdxsRef.current[columnGroupId]?.firstIdx)
          || (lastIdx !== visibleColumnIdxsRef.current[columnGroupId].lastIdx)
        ) {
          visibleColumnIdxsRef.current[columnGroupId] = {
            firstIdx: Math.max(0, firstVisibleColumnIdx),
            lastIdx: Math.max(-1, lastVisibleColumnIdx),
          };
        }
      } else if (firstVisibleColumnIdx === null) {
        visibleColumnIdxsRef.current[columnGroupId] = null;
      } else {
        visibleColumnIdxsRef.current[columnGroupId] = undefined;
      }
    }, []),


    /**
     * Function to set the measured height of a cell, selected by a given column
     * group ID, dataset ID and cell ID. The cells are grouped by datasets.
     *
     * @param columnGroupId - The ID of a group of columns.
     * @param datasetId - The ID of a dataset.
     * @param cellId - The ID of a cell of the dataset layout used by the dataset.
     * @param startRowIdx - The index of the first row, this cell spans.
     * @param endRowIdx - The index of the last row, this cell spans.
     * @param height - The measured height of the cell spans across the row.
     */
    setCellHeight: useCallback((columnGroupId: ColumnGroupId, datasetId: DatasetId, cellId: CellId, startRowIdx: number, endRowIdx: number, height: number) => {
      setCellHeight(
        String(datasetId),
        ucidMapper(columnGroupId, datasetId, cellId),
        startRowIdx,
        endRowIdx,
        height,
      );
    }, [setCellHeight]),


    /**
     * Function to set the measured width of a cell, selected by a given column
     * group ID, dataset ID and cell ID. The cells are grouped by column groups.
     *
     * @param columnGroupId - The ID of a group of columns.
     * @param datasetId - The ID of a dataset.
     * @param cellId - The ID of a cell of the dataset layout used by the dataset.
     * @param startColumnIdx - The index of the first column, this cell spans.
     * @param endColumnIdx - The index of the last column, this cell spans.
     * @param width - The measured width of the cell spans across the column.
     */
    setCellWidth: useCallback((columnGroupId: ColumnGroupId, datasetId: DatasetId, cellId: CellId, startColumnIdx: number, endColumnIdx: number, width: number) => {
      setCellWidth(
        columnGroupId,
        ucidMapper(columnGroupId, datasetId, cellId),
        startColumnIdx,
        endColumnIdx,
        width,
      );
    }, [setCellWidth]),
  };
  //                                                                                  </editor-fold>
};


export { useTableLayout };
