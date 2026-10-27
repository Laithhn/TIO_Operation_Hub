import { useRef, useCallback } from 'react';

import useDimensions from './useDimensions';
import useCache from './useCache';


/**
 * External function to build the unique cell ID by the given column group ID, dataset ID and by the
 * cell ID of the used dataset layout.
 *
 * @param {string|number} columnGroupId - The ID of a group of columns.
 * @param {string|number} datasetId - The ID of a dataset.
 * @param {string|number} cellId - The ID of a cell of a dataset layout used by the dataset.
 */
const ucidMapper = (columnGroupId, datasetId, cellId) => `${columnGroupId}.${datasetId}.${cellId}`;


/**
 * React hook to handle the complete data table layout, consisting of column groups with columns,
 * datasets with rows and cells.
 */
const useTableLayout = ({
  columns, datasetLayout, defaultColumnWidth, defaultRowHeight, columnGap, defaultAverageDatasetHeight,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const visibleColumnIdxsRef = useRef({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const { cache } = useCache();


  /**
   * @typedef {object} UseTableMeasurerDeriveColumns
   * @property {number} numColumns - The total number of all columns of a column group (inclusive
   *   the hidden ones).
   * @property {object[]} columnWidths - An array with the dimension information of all columns of a
   *   column group (inclusive the hidden ones). If a column is marked as hidden, the value is null.
   *   Otherwise the values are objects with the fields "dim" and "measure". If "measure" is false
   *   or not set, "dim" is the fix width of the column as number. If the column has to be measured,
   *   "dim" is the minimium width of it and "measure" is true (means "auto") or "min-content".
   * @property {number} numVisibleColumns - The number of the visible columns of a group.
   * @property {number[]} visibleColumnIdxs - An array with only the indexes of the visible columns
   *   of a group without the indexes of the hidden ones.
   * @property {boolean} endLine - True if the column group should end with a line or false if not.
   */

  /**
   * Memoized helper function to return cached information about the columns of a column group. The
   * information will be derived from the given props "columns" and "defaultColumnWidth" for each
   * column group. Note that there is no double caching: the same given columns can be assigned to
   * several column groups, but these column arrays have no ID to differentiate them. And column
   * groups usually do not occur as often as datasets. So the resulted and returned column
   * information are derived new for every column group.
   *
   * @param {string|number} columnGroupId - The ID of a group of columns.
   * @returns {UseTableMeasurerDeriveColumns}
   */
  const deriveColumns = useCallback((columnGroupId) => cache(
    ['deriveColumns', columnGroupId],
    (typeof columns === 'function') ? columns(columnGroupId) : columns,
    defaultColumnWidth,
    (cachedColumns, cachedDefaultColumnWidth) => {
      let endLine = false,
        allColumns;

      if (Array.isArray(cachedColumns)) {
        allColumns = cachedColumns;
      } else if (cachedColumns && (typeof cachedColumns === 'object')) {
        if (!Array.isArray(cachedColumns.columns)) {
          throw new Error(`VIWGF/Components/Helpers > TablePreparer/useTableLayout > deriveColumns(): the columns queried for column group ID "${columnGroupId}" is given as object but without an array named "columns".`);
        }

        allColumns = cachedColumns.columns;
        endLine = (cachedColumns.endLine === true);
      } else {
        throw new Error(`VIWGF/Components/Helpers > TablePreparer/useTableLayout > deriveColumns(): the columns queried for column group ID "${columnGroupId}" are neither an array nor an object, it's prototype is "${Object.prototype.toString.call(cachedColumns)}".`);
      }


      const safeDefaultColumnWidth = (Number.isFinite(cachedDefaultColumnWidth) && (cachedDefaultColumnWidth >= 0))
        ? cachedDefaultColumnWidth : 0;

      const visibleColumnIdxs = [];

      // iterate over each given column...
      const columnWidths = allColumns.map((column, idx) => {
        if (!column || (typeof column !== 'object')) {
          throw new Error(`VIWGF/Components/Helpers > TablePreparer/useTableLayout > deriveColumns(): the ${idx + 1}. column of column group "${columnGroupId}" is not an object. It's prototype is "${Object.prototype.toString.call(column)}".`);
        }

        const { width, autoWidth, hidden } = column;

        if (hidden === true) {
          return null;
        }

        visibleColumnIdxs.push(idx);

        const dim = (Number.isFinite(width) && (width >= 0)) ? width : safeDefaultColumnWidth;
        let measure;

        switch (autoWidth) {
          case true:
          case 'auto': measure = true; break;
          case 'minContent':
          case 'min-content': measure = 'min-content'; break;
          default: measure = false; break;
        }

        return { dim, measure };
      });

      return {
        numColumns: allColumns.length,
        columnWidths,
        numVisibleColumns: visibleColumnIdxs.length,
        visibleColumnIdxs,
        endLine,
      };
    },
  ), [columns, defaultColumnWidth, cache]);


  /**
   * @typedef {object} UseTableMeasurerDeriveDatasetLayout
   * @property {string|number} datasetLayoutId - The ID of the dataset layout, used by a dataset.
   * @property {number} numRows - The total number of all rows of a dataset (inclusive the hidden
   *   ones).
   * @property {object[]} rowHeights - An array with the dimension information of all rows of a
   *   dataset (inclusive the hidden ones). If a row is marked as hidden, the value is null.
   *   Otherwise the values are objects with the fields "dim" and "measure". If "measure" is false
   *   or not set, "dim" is the fix height of the row as number. If the row has to be measured,
   *   "dim" is the minimium height of it and "measure" is true (means "auto") or "min-content".
   * @property {number} numVisibleRows - The number of the visible rows of a dataset.
   * @property {number[]} visibleRowIdxs - An array with only the indexes of the visible rows of a
   *   dataset without the indexes of the hidden ones.
   * @property {array} rowCells - An array with the cells data of all visible rows of a dataset. The
   *   cells data can be an array of cell IDs or a function to get this array of cell IDs for a
   *   given column group ID.
   * @property {number} addHeight - An additional height that has to be added to the total height of
   *   the dataset.
   * @property {boolean} bottomLine - True, if the dataset has to get a final line at the bottom.
   */

  /**
   * Memoized helper function to return double cached information about a dataset and its rows. The
   * information will be derived from the given props "datasetLayout" and "defaultRowHeight" for
   * each dataset. But there is a double caching, because typically a large number of datasets are
   * using the same dataset layouts.
   *
   * @param {string|number} datasetId - The ID of a dataset.
   * @returns {UseTableMeasurerDeriveDatasetLayout}
   */
  const deriveDatasetLayout = useCallback((datasetId) => cache(
    ['deriveDatasetLayout', datasetId],
    (typeof datasetLayout === 'function') ? datasetLayout(datasetId) : datasetLayout,
    defaultRowHeight,
    (cachedDatasetLayout, cachedDefaultRowHeight) => {
      if (!cachedDatasetLayout || (typeof cachedDatasetLayout !== 'object')) {
        throw new Error(`VIWGF/Components/Helpers > TablePreparer/useTableLayout > deriveDatasetLayout(): the dataset layout queried for dataset ID "${datasetId}" is not an object, it's prototype is "${Object.prototype.toString.call(cachedDatasetLayout)}".`);
      }

      if ((typeof cachedDatasetLayout.id !== 'string') || (cachedDatasetLayout.id === '')) {
        throw new Error(`VIWGF/Components/Helpers > TablePreparer/useTableLayout > deriveDatasetLayout(): the dataset layout queried for dataset ID ${datasetId} has no valid field "id" that must be a not-empty string.`);
      }

      return cache(
        ['datasetLayoutsById', cachedDatasetLayout.id],
        cachedDatasetLayout,
        cachedDefaultRowHeight,
        ({
          id, rows, addHeight, noBottomLine,
        }, doubleCachedDefaultRowHeight) => {
          if (!Array.isArray(rows)) {
            throw new Error(`VIWGF/Components/Helpers > TablePreparer/useTableLayout > deriveDatasetLayout(): the dataset layout with ID "${id}" has no valid field "rows" that must be a not empty array. It's prototype is "${Object.prototype.toString.call(rows)}".`);
          } else if (rows.length <= 0) {
            throw new Error(`VIWGF/Components/Helpers > TablePreparer/useTableLayout > deriveDatasetLayout(): array "rows" of the dataset layout with ID "${id}" is empty. There must be at least one row.`);
          }

          const safeDefaultRowHeight = (Number.isFinite(doubleCachedDefaultRowHeight) && (doubleCachedDefaultRowHeight >= 0))
            ? doubleCachedDefaultRowHeight : 0;

          const visibleRowIdxs = [];
          const rowCells = [];
          const bottomLine = !noBottomLine;

          // iterate over each given row...
          const rowHeights = rows.map((row, idx) => {
            if (!row || (typeof row !== 'object')) {
              throw new Error(`VIWGF/Components/Helpers > TablePreparer/useTableLayout > deriveDatasetLayout(): the ${idx + 1}. row of dataset layout "${id}" is not an object. It's prototype is "${Object.prototype.toString.call(row)}".`);
            }

            const {
              height, autoHeight, hidden, cells,
            } = row;

            if (hidden === true) {
              return null;
            }

            visibleRowIdxs.push(idx);

            rowCells.push(cells);

            const dim = (Number.isFinite(height) && (height >= 0)) ? height : safeDefaultRowHeight;
            let measure;

            switch (autoHeight) {
              case true:
              case 'auto': measure = true; break;
              case 'minContent':
              case 'min-content': measure = 'min-content'; break;
              default: measure = false; break;
            }

            return { dim, measure };
          });

          return {
            datasetLayoutId: id,
            numRows: rows.length,
            rowHeights,
            numVisibleRows: visibleRowIdxs.length,
            visibleRowIdxs,
            rowCells,
            addHeight: ((Number.isFinite(addHeight) && (addHeight > 0)) ? addHeight : 0) + bottomLine,
            bottomLine,
          };
        },
      );
    },
  ), [datasetLayout, defaultRowHeight, cache]);


  /**
   * @typedef {object} UseTableMeasurerCellsMetaData
   * @property {string} cellId - The ID of the cell.
   * @property {number} startRowIdx - The zero based index of the first row, the cell spans. This is
   *   the original index considering all rows.
   * @property {number} endRowIdx - The zero based index of the last row, the cell spans. This is
   *   the original index considering all rows.
   * @property {number} startColumnIdx - The zero based index of the first column, the cell spans.
   *   This is the original index considering all coliumns.
   * @property {number} endColumnIdx - The zero based index of the last column, the cell spans. This
   *   is the original index considering all coliumns.
   * @property {boolean} measureHeight - True, if the height of this cell has to be measured.
   * @property {boolean} measureWidth - True, if the width of this cell has to be measured.
   */

  /**
   * @typedef {object} UseTableMeasurerDeriveCells
   * @property {string|number} datasetLayoutId - The ID of the used dataset layout.
   * @property {string} gridTemplateAreas - The resulting string for CSS property
   *   grid-template-areas of the column group and dataset with all visible cell IDs.
   * @property {UseTableMeasurerCellsMetaData[]} cellsMetaData - Array of meta data of all visible
   *   cells, that should render.
   */

  /**
   * Memoized helper function to return double cached information about the cells of a dataset for
   * a column group. The information will be derived from the derived columns and dataset layouts
   * above for a given column group ID and a given dataset ID. It is doubled cached because
   * typically a large number of datasets are using the same dataset layout.
   * Note that if there are anywhere changes in any deep dependencies for the given column group and
   * dataset ID (columns, datasetLayout, defaultColumnWidth, defaultRowHeight), all associated cell
   * meta data objects and its enclosing arrays are created new. This is to force rendering and
   * re-measuring of the cells.
   *
   * @param {string|number} columnGroupId - The ID of a group of columns.
   * @param {string|number} datasetId - The ID of a dataset.
   * @returns {UseTableMeasurerDeriveCells}
   */
  const deriveCells = useCallback((columnGroupId, datasetId) => cache(
    ['deriveCells', columnGroupId, datasetId],
    deriveColumns(columnGroupId),
    deriveDatasetLayout(datasetId),
    (cachedColumns, cachedDatasetLayout) => cache(
      ['cellsByColumnGroupAndDatasetLayoutId', columnGroupId, cachedDatasetLayout.datasetLayoutId],
      cachedColumns,
      cachedDatasetLayout,
      ({
        numColumns, columnWidths, numVisibleColumns, visibleColumnIdxs,
      }, {
        datasetLayoutId, rowHeights, numVisibleRows, visibleRowIdxs, rowCells,
      }) => {
        if (!numVisibleColumns || !numVisibleRows) {
          return {
            datasetLayoutId,
            gridTemplateAreas: '',
            cellsMetaData: [],
          };
        }

        // Iterate the first time over the visible rows to check and standardize their cells, solve
        // cell magic. After this, allCells is an array of arrays (for only the visible rows) of
        // cell IDs (for every column).
        const allCells = rowCells.map((cells, rowIdx) => {
          let cellsOfColumnGroup = (typeof cells === 'function') ? cells(columnGroupId, datasetLayoutId) : cells;

          if (!Array.isArray(cellsOfColumnGroup)) {
            throw new Error(`VIWGF/Components/Helpers > TablePreparer/useTableLayout > deriveCells(): the ${visibleRowIdxs[rowIdx] + 1}. row of dataset layout "${datasetLayoutId}" has no valid field "cells" for column group "${columnGroupId}" that must be a not empty array. It's prototype is "${Object.prototype.toString.call(cellsOfColumnGroup)}".`);
          } else if (cellsOfColumnGroup.length <= 0) {
            throw new Error(`VIWGF/Components/Helpers > TablePreparer/useTableLayout > deriveCells(): array "cells" of the ${visibleRowIdxs[rowIdx] + 1}. row of dataset layout "${datasetLayoutId}" is empty for column group "${columnGroupId}". There must be at least one cell.`);
          }

          // Solve cells magic #1: "repeat(num, id)" is allowed to insert a cell ID multile times.
          // Also ensure, that the cell IDs are not empty strings.
          cellsOfColumnGroup = cellsOfColumnGroup.reduce((acc, cellId) => {
            if (cellId.startsWith('repeat')) {
              const [, num, multiCellId] = cellId.match(/^repeat\((\d+),\s*(\S+)\s*\)$/) || [];

              if ((num > 0) && (typeof multiCellId === 'string') && (multiCellId !== '')) {
                return [...acc, ...(new Array(parseInt(num, 10))).fill(multiCellId)];
              }
            }

            return [
              ...acc,
              ((typeof cellId === 'string') && (cellId !== '')) ? cellId : '.',
            ];
          }, []);

          // Solve cells magic #2: fill missing cell IDs with the ID of the last cell
          const origLength = cellsOfColumnGroup.length;
          if (origLength < numColumns) {
            cellsOfColumnGroup.length = numColumns;
            cellsOfColumnGroup.fill(cellsOfColumnGroup[origLength - 1], origLength);
          }

          return cellsOfColumnGroup;
        });

        const consideredCellIds = [];
        const cellsMetaData = [];
        // The collection of the IDs to build gridTemplateAreas are a two-dimensional array. But
        // only the visible columns and rows are considered.
        const idsForTemplate = (new Array(numVisibleRows)).fill(null).map(
          () => (new Array(numVisibleColumns)).fill('.'),
        );

        // iterate over each visible row...
        visibleRowIdxs.forEach((rowIdx, visibleRowIdx) => {
          const cells = allCells[visibleRowIdx];

          // iterate over each visible column...
          visibleColumnIdxs.forEach((columnIdx, visibleColumnIdx) => {
            const cellId = cells[columnIdx];

            if ((cellId !== '.') && !consideredCellIds.includes(cellId)) {
              const startRowIdx = rowIdx;
              const startColumnIdx = columnIdx;
              let endRowIdx = rowIdx,
                endColumnIdx = columnIdx,
                endVisibleColumnIdx = visibleColumnIdx,
                measureHeight = !!rowHeights[rowIdx].measure,
                measureWidth = !!columnWidths[columnIdx].measure;

              idsForTemplate[visibleRowIdx][visibleColumnIdx] = cellId;

              // search after the cell (in the same row) for the same cell ID to expand the column
              // range...
              for (let vcIdx = (visibleColumnIdx + 1); vcIdx < numVisibleColumns; vcIdx++) {
                const cIdx = visibleColumnIdxs[vcIdx];
                if (cells[cIdx] === cellId) {
                  endColumnIdx = cIdx;
                  endVisibleColumnIdx = vcIdx;
                  idsForTemplate[visibleRowIdx][vcIdx] = cellId;

                  if (!measureWidth) {
                    measureWidth = !!columnWidths[cIdx].measure;
                  }
                } else {
                  break;
                }
              }

              // search below the cell (in the same column) for the same cell ID to expand the row
              // range...
              for (let vrIdx = (visibleRowIdx + 1); vrIdx < numVisibleRows; vrIdx++) {
                if (allCells[vrIdx][columnIdx] === cellId) {
                  const rIdx = visibleRowIdxs[vrIdx];
                  endRowIdx = rIdx;

                  for (let vcIdx = visibleColumnIdx; vcIdx <= endVisibleColumnIdx; vcIdx++) {
                    idsForTemplate[vrIdx][vcIdx] = cellId;
                  }

                  if (!measureHeight) {
                    measureHeight = !!rowHeights[rIdx].measure;
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
          });
        });

        return {
          datasetLayoutId,
          gridTemplateAreas: idsForTemplate.map((rowArr) => `"${rowArr.join(' ')}"`).join(' '),
          cellsMetaData,
        };
      },
    ),
  ), [deriveColumns, deriveDatasetLayout, cache]);


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
      (datasetId) => deriveDatasetLayout(datasetId).rowHeights,
      [deriveDatasetLayout],
    ),

    // getDivisionGap is not used for the datasets

    getAdditionalDimension: useCallback(
      (datasetId) => deriveDatasetLayout(datasetId).addHeight,
      [deriveDatasetLayout],
    ),

    defaultAverageTotalDimension: defaultAverageDatasetHeight,
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
      (columnGroupId) => deriveColumns(columnGroupId).columnWidths,
      [deriveColumns],
    ),

    getDivisionGap: useCallback(() => columnGap, [columnGap]),

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
     * Returned memoized function to return the cached heights of the rows of a dataset, selected by
     * the ID of the dataset. Also the total height of the dataset (inclusive gaps) and a joined
     * height string are derived. For all heights that have to be measured,
     * "minmax(<height>px, auto)" or "minmax(<height>px, min-content)" is taken for the joined
     * height string instead of "<height>px".
     *
     * @param {number|string} datasetId - The ID of a dataset.
     * @returns {{ heights: number[], totalHeight: number, gridTemplateRows: string, bottomLine: boolean }}
     */
    getDatasetHeights: useCallback((datasetId) => {
      const { dims, totalDim, joinedDims } = getDatasetHeights(datasetId);

      return {
        heights: dims,
        totalHeight: totalDim,
        gridTemplateRows: joinedDims,
      };
    }, [getDatasetHeights]),


    /**
     * Returned memoized function to return the cached widths of the columns of a group of columns,
     * selected by the ID of the group. Also the total width of the column group (inclusive gaps)
     * and a joined width string are derived. For all widths that have to be measured,
     * "minmax(<width>px, auto)" or "minmax(<width>px, min-content)" is taken for the joined width
     * string instead of "<width>px".
     *
     * @param {number|string} columnGroupId - The ID of a group of columns.
     * @returns {{ widths: number[], totalWidth: number, gridTemplateColumns: string }}
     */
    getColumnGroupWidths: useCallback((columnGroupId) => {
      const { dims, totalDim, joinedDims } = getColumnGroupWidths(columnGroupId);

      return {
        widths: dims,
        totalWidth: totalDim,
        gridTemplateColumns: joinedDims,
      };
    }, [getColumnGroupWidths]),


    /**
     * Returned memoized function...
     *
     * @param {number|string} columnGroupId - The ID of a group of columns.
     * @param {number|string} datasetId - The ID of a dataset.
     * @returns {string}
     */
    getGridTemplateAreas: useCallback(
      (columnGroupId, datasetId) => deriveCells(columnGroupId, datasetId).gridTemplateAreas,
      [deriveCells],
    ),


    /**
     * Returned memoized function that returns the meta data of all cells that have to be rendered
     * of a given column group and dataset.
     *
     * @param {number|string} columnGroupId - The ID of a group of columns.
     * @param {number|string} datasetId - The ID of a dataset.
     * @returns {object}
     */
    getCellsMetaData: useCallback((columnGroupId, datasetId) => {
      const { datasetLayoutId, cellsMetaData } = deriveCells(columnGroupId, datasetId);

      return cache(
        ['getCellsMetaData', columnGroupId, datasetLayoutId],
        cellsMetaData,
        visibleColumnIdxsRef.current[columnGroupId],
        (cachedCellsMetaData, cachedVisibleColumnIdxs) => {
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
    }, [cache, deriveCells]),


    /**
     * Returned memoized function that returns true, if a column group should end with a line.
     *
     * @param {number|string} columnGroupId - The ID of a group of columns.
     * @returns {boolean}
     */
    hasEndLine: useCallback(
      (columnGroupId) => deriveColumns(columnGroupId).endLine,
      [deriveColumns],
    ),


    /**
     * Returned memoized function that returns true, if a dataset should end with a bottom line.
     *
     * @param {number|string} datasetId - The ID of a dataset.
     * @returns {boolean}
     */
    hasBottomLine: useCallback(
      (datasetId) => deriveDatasetLayout(datasetId).bottomLine,
      [deriveDatasetLayout],
    ),


    /**
     * Returned memoized function to return the average of the total height of all datasets, which
     * dimensions are queried by function getDatasetHeights before.
     *
     * @returns {number}
     */
    getAverageHeightOfAllDatasets,


    /**
     * Returned memoized function to set the resulted indexes of the first and last visible columns
     * of a column group, selected by the given ID. This function has to be called for every
     * existing columnGroupId before getting the meta data of the visible cells by function
     * getCellsMetaData! If no indexes are given (undefined), all columns are shown.
     *
     * @param {number|string} columnGroupId - The ID of a group of columns.
     * @param {number} firstVisibleColumnIdx - The resulted index of the first visible column, can
     *   be 0 or greater. Or if it is null, the complete column group is invisible.
     * @param {number} lastVisibleColumnIdx - The resulted index of the last visible column. It can
     *   be 0 or greater or it can be -1 if there is no limit at the end of the columns.
     */
    setFirstAndLastVisibleColumns: useCallback((columnGroupId, firstVisibleColumnIdx, lastVisibleColumnIdx) => {
      if (Number.isFinite(firstVisibleColumnIdx) && Number.isFinite(lastVisibleColumnIdx)) {
        const firstIdx = Math.max(0, firstVisibleColumnIdx);
        const lastIdx = Math.max(-1, lastVisibleColumnIdx);

        if (
          (firstIdx !== visibleColumnIdxsRef.current[columnGroupId]?.firstIdx)
          || (lastIdx !== visibleColumnIdxsRef.current[columnGroupId]?.lastIdx)
        ) {
          visibleColumnIdxsRef.current[columnGroupId] = {
            firstIdx: Math.max(0, firstVisibleColumnIdx),
            lastIdx: Math.max(-1, lastVisibleColumnIdx),
          };
        }
      } else if (firstVisibleColumnIdx === null) {
        visibleColumnIdxsRef.current[columnGroupId] = null;
      } else {
        delete visibleColumnIdxsRef.current[columnGroupId];
      }
    }, []),


    /**
     * Returned memoized function to set the measured height of a cell, selected by a given column
     * group ID, dataset ID and cell ID. The cells are grouped by datasets.
     *
     * @param {number|string} columnGroupId - The ID of a group of columns.
     * @param {number|string} datasetId - The ID of a dataset.
     * @param {number|string} cellId - The ID of a cell of the dataset layout used by the dataset.
     * @param {number} startRowIdx - The index of the first row, this cell spans.
     * @param {number} endRowIdx - The index of the last row, this cell spans.
     * @param {number} height - The measured height of the cell spans across the row.
     */
    setCellHeight: useCallback((columnGroupId, datasetId, cellId, startRowIdx, endRowIdx, height) => {
      setCellHeight(
        datasetId,
        ucidMapper(columnGroupId, datasetId, cellId),
        startRowIdx,
        endRowIdx,
        height,
      );
    }, [setCellHeight]),


    /**
     * Returned memoized function to set the measured width of a cell, selected by a given column
     * group ID, dataset ID and cell ID. The cells are grouped by column groups.
     *
     * @param {number|string} columnGroupId - The ID of a group of columns.
     * @param {number|string} datasetId - The ID of a dataset.
     * @param {number|string} cellId - The ID of a cell of the dataset layout used by the dataset.
     * @param {number} startColumnIdx - The index of the first column, this cell spans.
     * @param {number} endColumnIdx - The index of the last column, this cell spans.
     * @param {number} width - The measured width of the cell spans across the column.
     */
    setCellWidth: useCallback((columnGroupId, datasetId, cellId, startColumnIdx, endColumnIdx, width) => {
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

export default useTableLayout;
