import PropTypes from 'prop-types';
import {
  forwardRef, useState, useRef, useMemo, useImperativeHandle, useCallback, useLayoutEffect,
  useEffect,
} from 'react';

import defines from 'assets/defines';

import ContextCellMeasurer from './contextCellMeasurer';
import useCellMeasurer from './useCellMeasurer';
import useTableLayout from './useTableLayout';


/**
 *
 */
const getInitialParamsForTable = () => ({
  estScrollLeft: 0,
  estScrollWidth: 0,
  estScrollTop: 0,
  estScrollHeight: 0,
  isScrollMovementX: false,
  isScrollMovementY: false,
  translateX: 0,
  translateY: 0,
  freezedColumnGroupsWidth: 0,
  freezedDatasetsTopHeight: 0,
  freezedDatasetsBottomHeight: 0,
  freezedDatasetPartsOfFreezedColumnGroups: [],
  freezedDatasetPartsOfScrollableColumnGroups: [],
  datasetPartsOfFreezedColumnGroups: [],
  datasetPartsOfScrollableColumnGroups: [],
});


/**
 *
 */
const getInitialLeadDatasetData = () => ({
  id: undefined,
  idx: null,
  posY: 0,
});


/**
 * Static function to generate the initial data for the scroll container.
 */
const getInitialScrollContrData = () => ({
  translateX: 0,
  translateY: 0,
  prevSetY: {
    timestamp: 0,
    remainingScrollDist: 0,
  },
});


/**
 *
 */
const getInitialPrevsData = () => ({
  scrollDistX: 0,
  scrollDistY: 0,
  activeDatasetId: null,
  resetTable: null,
  veryFirstDatasetId: null,
  veryLastDatasetId: null,
  deriveParamsForTable: null,
});


const logging = (process.env.NODE_ENV === 'development') && false;


/**
 *
 */
const TablePreparer = forwardRef(({
  id, tableWidth, tableHeight, scrollDistX, scrollDistY, columns, datasetLayout,
  freezedColumnGroupIds, columnGroupIds, freezedDatasetIds, datasetIds, activeDatasetId,
  areDatasetsBefore, areDatasetsAfter, onRequestDatasets, stayOnTop, resetTable,
  expandTableTopBottomFactor, expandTableLeftRightFactor, defaultColumnWidth, defaultRowHeight,
  columnGap, datasetPaddingLeft, datasetPaddingRight, defaultAverageDatasetHeight, smoothScrolling,
  children,
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  // The IDs of the first and last datasets of prop datasetIds, but only if they are also rendered.
  // Otherwise, the values are null. These values are used to decide to request further datasets
  // before or after the given ones.
  const [veryFirstDatasetId, setVeryFirstDatasetId] = useState(null);
  const [veryLastDatasetId, setVeryLastDatasetId] = useState(null);

  // The estimated number of datasets that are rendered, used for the request of further datasets.
  const [averageNumVisibleDatasets, setAverageNumVisibleDatasets] = useState(0);

  // The resulted parameters of the table preparer that are returned to build the data table. The
  // estimated scroll values are based on the assumption that all existing column groups and
  // datasets would be rendered. These values are only for the scroll bars.
  const [paramsForTable, setParamsForTable] = useState(getInitialParamsForTable());

  // The lead dataset that is the first fully visible dataset on top of the table below the freezed
  // datasets.
  const leadDatasetRef = useRef(getInitialLeadDatasetData());

  // Data for the scroll containers with the datasets.
  const scrollContrRef = useRef(getInitialScrollContrData());

  const prevsRef = useRef(getInitialPrevsData());

  const readyToRequestDatasetsRef = useRef();
  const initialDatasetsRequestedRef = useRef(false);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const {
    getDatasetHeights, getColumnGroupWidths, getGridTemplateAreas, getCellsMetaData, hasEndLine,
    hasBottomLine, getAverageHeightOfAllDatasets, setFirstAndLastVisibleColumns, setCellHeight,
    setCellWidth,
  } = useTableLayout({
    columns,
    datasetLayout,
    defaultColumnWidth,
    defaultRowHeight,
    columnGap,
    defaultAverageDatasetHeight,
  });


  // Collect functions of the table layout to provide them via React context to the children of the
  // TablePreparer, e.g. to the cells of the table. These functions are used to measure the cells
  // and pipe the measurments into the table layout.
  const funcsForContext = useMemo(() => ({
    setCellHeight,
    setCellWidth,
  }), [setCellHeight, setCellWidth]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Memoized main function of the table preparer to derive all parameters, the data table needs to
   * render.
   *
   * @param {string} [shiftTable] - Command to shift the lead dataset: "toTop", "toBottom",
   *   "oneDatasetUp", "oneDatasetDown", "pageUp" or "pageDown".
   */
  const deriveParamsForTable = useCallback((shiftTable = undefined) => {
    const numFreezedColumnGroups = freezedColumnGroupIds.length;
    const freezedDatasetIdsTop = Array.isArray(freezedDatasetIds)
      ? freezedDatasetIds
      : (freezedDatasetIds?.top ?? []);
    const freezedDatasetIdsBottom = freezedDatasetIds?.bottom ?? [];
    const numFreezedDatasetsTop = freezedDatasetIdsTop.length;
    const numFreezedDatasetsBottom = freezedDatasetIdsBottom.length;
    const numDatasets = datasetIds.length;
    const visibleColumnGroups = { byId: {}, allIds: [], num: 0 };
    const datasetsToRender = [];
    const freezedDatasetPartsOfFreezedColumnGroups = [];
    const freezedDatasetPartsOfScrollableColumnGroups = [];
    const datasetPartsOfFreezedColumnGroups = [];
    const datasetPartsOfScrollableColumnGroups = [];
    const averageDatasetHeight = getAverageHeightOfAllDatasets();
    let freezedColumnGroupsWidth = 0,
      scrollableColumnGroupsWidth = 0,
      freezedDatasetsTopHeight = 0,
      freezedDatasetsBottomHeight = 0,
      estScrollHeight = 0,
      estScrollTop = 0,
      isScrollMovementX = false,
      isScrollMovementY = false, // will be true if there is a scroll movement of the container that was caused either by a user interaction (e.g. keys, mouse wheel) or any similar (like staying on top of the table)
      nextVeryFirstDatasetId = null,
      nextVeryLastDatasetId = null,
      firstIdx, lastIdx, // the indexes of the first and last datasets in array datasetIds that are rendered
      startPosY = 0,
      nextPosY = 0;

    // ---------------------------------------------------------------------------------------------
    // Step 1: if there are no datasets or if the table has no visible range, break off here and
    // reset the states.
    // ---------------------------------------------------------------------------------------------

    if (
      ((numFreezedDatasetsTop === 0) && (numFreezedDatasetsBottom === 0) && (numDatasets === 0))
      || (tableWidth <= 0)
      || (tableHeight <= 0)
    ) {
      setVeryFirstDatasetId(null);
      setVeryLastDatasetId(null);
      setAverageNumVisibleDatasets(Math.ceil(tableHeight / averageDatasetHeight));
      setParamsForTable(getInitialParamsForTable());
      return;
    }


    // ---------------------------------------------------------------------------------------------
    // Step 2: collect information about the widths of all visible column groups and store these in
    // variable "visibleColumnGroups" for later use. Calculate the total width of the freezed column
    // groups. Set the information, if the column groups and their columns are visible or not in the
    // table layout.
    // ---------------------------------------------------------------------------------------------

    /**
     * Function to set the data of all full or partial visible column groups (given by their IDs) of
     * a series of column group to variable "visibleColumnGroups". The information about the
     * visibility of the column groups and their columns is also set to the table layout by its
     * function "setFirstAndLastVisibleColumns".
     *
     * @param {string[]} ids - Array with the IDs of the column groups.
     * @param {number} minPos - The minimum position of the available visible area.
     * @param {number} maxPos - The maximum position of the available visible area.
     * @param {boolean} [areForFreezedColumnGroups=false] - True, if the given IDs belongs to
     *   freezed column groups.
     * @returns {number} The end position at the end of all of the given column groups.
     */
    const setVisibleColumnGroups = (ids, minPos, maxPos, areForFreezedColumnGroups = false) => {
      const num = ids.length;
      let nextPos = 0;

      for (let i = 0; i < num; i++) {
        if (nextPos >= maxPos) {
          // don't show the complete column group and all the rest also not; break here
          for (let j = i; j < num; j++) {
            setFirstAndLastVisibleColumns(ids[j], null);
          }
          break;
        }

        const columnGroupId = ids[i];
        const cgw = getColumnGroupWidths(columnGroupId);

        if (cgw.totalWidth === 0) {
          // don't show the complete column group because it has no visible columns
          setFirstAndLastVisibleColumns(columnGroupId, null);
        } else {
          // ok, there must be any visible columns...
          const endLine = hasEndLine(columnGroupId);
          const posBevorColumns = nextPos + datasetPaddingLeft;
          const posAfterColumns = posBevorColumns + cgw.totalWidth;

          if ((posAfterColumns <= minPos) || (posBevorColumns >= maxPos)) {
            // show the column group with no columns
            setFirstAndLastVisibleColumns(columnGroupId, null);
          } else if ((posBevorColumns >= minPos) && (posAfterColumns <= maxPos)) {
            // show the column group with all columns
            setFirstAndLastVisibleColumns(columnGroupId);
          } else {
            // show the column group with only some columns
            let firstVisibleColumnIdx = null,
              lastVisibleColumnIdx = 0,
              columnPos = posBevorColumns;

            for (let colIdx = 0; colIdx < cgw.widths.length; colIdx++) {
              if (cgw.widths[colIdx] !== null) {
                columnPos += (cgw.widths[colIdx] + columnGap);
                lastVisibleColumnIdx = colIdx;

                if ((firstVisibleColumnIdx === null) && (columnPos > minPos)) {
                  firstVisibleColumnIdx = colIdx;
                }

                if (columnPos >= maxPos) {
                  break;
                }
              }
            }

            setFirstAndLastVisibleColumns(columnGroupId, firstVisibleColumnIdx, lastVisibleColumnIdx);
          }

          visibleColumnGroups.byId[columnGroupId] = {
            ...cgw,
            posX: nextPos,
            isFreezed: areForFreezedColumnGroups,
            endLine,
          };
          visibleColumnGroups.allIds.push(columnGroupId);

          nextPos = posAfterColumns + datasetPaddingRight + endLine;
        }
      }

      return nextPos;
    };


    // Step 2.1: handle the freezed column groups.
    freezedColumnGroupsWidth = setVisibleColumnGroups(
      freezedColumnGroupIds,
      0,
      tableWidth,
      true,
    );


    // Step 2.2: handle the scrollable column groups, but only, if there is enough space next to the
    // freezed ones.
    if (freezedColumnGroupsWidth < tableWidth) {
      // Step 2.2.1: in the first run, calculate the total width of all scrollable column groups and
      // set the new horizontal translate value by the given scroll distance. Note, that there must
      // be at least one column group in total. This will be corrected here automatically because of
      // backwards compatibility and because of an easier use of simple data tables with only one
      // column group.
      const scrollableColumnGroupIds = ((numFreezedColumnGroups === 0) && (columnGroupIds.length === 0))
        ? ['CG0']
        : columnGroupIds;

      scrollableColumnGroupsWidth = scrollableColumnGroupIds.reduce((acc, columnGroupId) => (
        acc + getColumnGroupWidths(columnGroupId).totalWidth + datasetPaddingRight + datasetPaddingLeft + hasEndLine(columnGroupId)
      ), 0);

      // note that scrollDistX becomes larger when scrolling to the right
      const relScrollDistX = Math.round(scrollDistX - prevsRef.current.scrollDistX);
      scrollContrRef.current.translateX = Math.min(
        0,
        Math.max(
          tableWidth - freezedColumnGroupsWidth - scrollableColumnGroupsWidth,
          scrollContrRef.current.translateX - relScrollDistX,
        ),
      );
      isScrollMovementX = (relScrollDistX !== 0);
      prevsRef.current.scrollDistX = scrollDistX;

      // Step 2.2.2: now collect the information about the widths of all visible scrollable column
      // groups.
      const expandTableLeftRight = Math.round(tableWidth * expandTableLeftRightFactor);

      setVisibleColumnGroups(
        scrollableColumnGroupIds,
        (-scrollContrRef.current.translateX - expandTableLeftRight),
        (-scrollContrRef.current.translateX + tableWidth - freezedColumnGroupsWidth + expandTableLeftRight),
      );
    }

    visibleColumnGroups.num = visibleColumnGroups.allIds.length;


    // ---------------------------------------------------------------------------------------------
    // Step 3: if there are no visible column groups, break off here and reset the state.
    // ---------------------------------------------------------------------------------------------

    if ((freezedColumnGroupsWidth === 0) && (scrollableColumnGroupsWidth === 0)) {
      setVeryFirstDatasetId(null);
      setVeryLastDatasetId(null);
      setAverageNumVisibleDatasets(Math.ceil(tableHeight / averageDatasetHeight));
      setParamsForTable(getInitialParamsForTable());
      return;
    }


    // ---------------------------------------------------------------------------------------------
    // Step 4: collect the data of all freezed datasets (top and bottom) to be rendered.
    // ---------------------------------------------------------------------------------------------

    for (let i = 0; i < numFreezedDatasetsTop; i++) {
      const datasetId = freezedDatasetIdsTop[i];
      const { totalHeight, gridTemplateRows } = getDatasetHeights(datasetId);
      const bottomLine = hasBottomLine(datasetId);

      for (let j = 0; j < visibleColumnGroups.num; j++) {
        const columnGroupId = visibleColumnGroups.allIds[j];
        const {
          gridTemplateColumns, posX, isFreezed, endLine,
        } = visibleColumnGroups.byId[columnGroupId];
        const gridTemplateAreas = getGridTemplateAreas(columnGroupId, datasetId);
        const cellsMetaData = getCellsMetaData(columnGroupId, datasetId);

        (isFreezed ? freezedDatasetPartsOfFreezedColumnGroups : freezedDatasetPartsOfScrollableColumnGroups).push({
          columnGroupId,
          datasetId,
          cellsMetaData,
          posX,
          posY: freezedDatasetsTopHeight,
          height: totalHeight,
          gridTemplateRows,
          gridTemplateColumns,
          gridTemplateAreas,
          endLine,
          bottomLine,
        });
      }

      freezedDatasetsTopHeight += totalHeight;
    }

    for (let i = (numFreezedDatasetsBottom - 1); i >= 0; i--) {
      const datasetId = freezedDatasetIdsBottom[i];
      const { totalHeight, gridTemplateRows } = getDatasetHeights(datasetId);
      const bottomLine = hasBottomLine(datasetId);

      freezedDatasetsBottomHeight += totalHeight;

      for (let j = 0; j < visibleColumnGroups.num; j++) {
        const columnGroupId = visibleColumnGroups.allIds[j];
        const {
          gridTemplateColumns, posX, isFreezed, endLine,
        } = visibleColumnGroups.byId[columnGroupId];
        const gridTemplateAreas = getGridTemplateAreas(columnGroupId, datasetId);
        const cellsMetaData = getCellsMetaData(columnGroupId, datasetId);

        (isFreezed ? freezedDatasetPartsOfFreezedColumnGroups : freezedDatasetPartsOfScrollableColumnGroups).push({
          columnGroupId,
          datasetId,
          cellsMetaData,
          posX,
          posY: tableHeight - freezedDatasetsBottomHeight,
          height: totalHeight,
          gridTemplateRows,
          gridTemplateColumns,
          gridTemplateAreas,
          endLine,
          topLine: bottomLine,
        });
      }
    }


    const nextAverageNumVisibleDatasets = Math.ceil((tableHeight - freezedDatasetsTopHeight - freezedDatasetsBottomHeight) / averageDatasetHeight);
    const logSteps = [];

    if (numDatasets) {
      const lastDatasetIdx = numDatasets - 1;
      // the relative scroll distance is positive if scrolling down and negative if scrolling up
      const relScrollDistY = Math.round(scrollDistY - prevsRef.current.scrollDistY);
      const scrollableTableHeight = tableHeight - freezedDatasetsTopHeight - freezedDatasetsBottomHeight;
      const expandTableTopBottom = Math.round(tableHeight * expandTableTopBottomFactor);
      let minTablePosY = -expandTableTopBottom,
        maxTablePosY = scrollableTableHeight + expandTableTopBottom,
        diffY;

      // -------------------------------------------------------------------------------------------
      // Step 5: determine the index and the vertical translate value (Y) of the lead dataset and
      // the vertical translate value (Y) of the dataset scroll container.
      // -------------------------------------------------------------------------------------------

      if ((relScrollDistY === 0) && (shiftTable === 'toBottom')) {
        // Step 5.1: if there is no scroll movement but a comand, to align the datasets to the
        // bottom of the table:
        // - take the last dataset as the lead one,
        // - place it directly below the freezed datasets (temporarily, it will be moved to the
        //   bottom of the table later in step 7.1),
        // - don't move the scroll container.

        leadDatasetRef.current.idx = lastDatasetIdx;
        leadDatasetRef.current.posY = -scrollContrRef.current.translateY;
        logSteps.push('5.1');
      } else if (
        ((relScrollDistY === 0) && (shiftTable === 'toTop'))
        || (leadDatasetRef.current.id === undefined)
      ) {
        // Step 5.2: if the datasets have to be shifted to the top (without scroll movement) or if
        // no lead dataset was previously stored (because the table was empty before or has been
        // reset by a change of prop resetTable):
        // - take the first dataset as the lead one (again),
        // - place it directly below the freezed datasets,
        // - don't move the scroll container.

        leadDatasetRef.current.idx = 0;
        leadDatasetRef.current.posY = -scrollContrRef.current.translateY;
        logSteps.push('5.2');
      } else if ((relScrollDistY === 0) && stayOnTop && (leadDatasetRef.current.idx === 0)) {
        // Step 5.3: if prop "stayOnTop" is true and previously the first dataset was the lead one
        // and there is no scroll movement...

        if (smoothScrolling) {
          // Step 5.3.1: ...and if smooth scrolling is to be used:
          // - take the (new) index of the previous lead dataset,
          // - don't move it,
          // - move the scroll container for the height of the datasets before the lead one, so the
          //   table will be moved to the top.

          const nextLeadDatasetIdx = Math.max(0, datasetIds.indexOf(leadDatasetRef.current.id));
          let heightOfDatasetsBefore = 0;

          for (let idx = (nextLeadDatasetIdx - 1); idx >= 0; idx--) {
            heightOfDatasetsBefore += getDatasetHeights(datasetIds[idx]).totalHeight;
          }

          leadDatasetRef.current.idx = nextLeadDatasetIdx;
          isScrollMovementY = true;
          scrollContrRef.current.translateY += heightOfDatasetsBefore;
          logSteps.push('5.3.1');
        } else {
          // Step 5.3.2: ...and if smooth scrolling is NOT to be used:
          // - take the first dataset as the lead one (again),
          // - place it directly below the freezed datasets,
          // - don't move the scroll container.

          leadDatasetRef.current.idx = 0;
          leadDatasetRef.current.posY = -scrollContrRef.current.translateY;
          logSteps.push('5.3.2');
        }
      } else {
        // Step 5.4: handle all other cases, mainly changes by scrolling.
        const nextLeadDatasetPosY = leadDatasetRef.current.posY - relScrollDistY + scrollContrRef.current.translateY;

        if ((nextLeadDatasetPosY >= minTablePosY) && (nextLeadDatasetPosY <= maxTablePosY)) {
          // Step 5.4.1: if the given relative vertical scroll distance (can also be 0), subtracted
          // from the vertical translate value of the previously stored lead dataset is WITHIN the
          // extended table range...

          const nextLeadDatasetIdx = datasetIds.indexOf(leadDatasetRef.current.id);

          if (nextLeadDatasetIdx >= 0) {
            // Step 5.4.1.1: ...and the previously stored lead dataset ID still exists:
            // - take the (new) index of the previous lead dataset,
            // - don't move it,
            // - move the scroll container.

            leadDatasetRef.current.idx = nextLeadDatasetIdx;
            logSteps.push('5.4.1.1');
          } else {
            // Step 5.4.1.2: ...and the previously stored lead dataset doesn't exist in the given
            // dataset IDs anymore:
            // - adopt the previously stored lead dataset index,
            // - don't move it,
            // - move the scroll container.

            leadDatasetRef.current.idx = Math.max(0, Math.min(lastDatasetIdx, leadDatasetRef.current.idx));
            logSteps.push('5.4.1.2');
          }

          isScrollMovementY = true;
          scrollContrRef.current.translateY -= relScrollDistY;

          if (smoothScrolling) {
            // Step 5.4.1.3: if smooth scrolling is to be used, add an additional way to the min or
            // max table position, because of its transition time. This will remove the datasets
            // with a little time delay.

            const now = Date.now();
            // The ratio of the time passed between the last scroll event and now, in relation to
            // the animation time, can be ]0, 1]. 1 means that the animation time has passed.
            const elapsedTimeRatio = (
              Math.min(defines.layout.defaultAnimationTimeMs, now - scrollContrRef.current.prevSetY.timestamp)
              / defines.layout.defaultAnimationTimeMs
            );
            // The remaining time ratio of the last scroll amaount, can be [0, 1[. 0 means that the
            // animation time of the last scroll event has passed.
            const remainingTimeRatio = 1 - elapsedTimeRatio;
            // the remaining distance of the last positive scroll event - will only be added to the
            // current relative scroll distance below, if the scrolling direction is the same
            let remainingScrollDist = Math.round(
              scrollContrRef.current.prevSetY.remainingScrollDist * remainingTimeRatio,
            );

            if (relScrollDistY > 0) {
              remainingScrollDist = relScrollDistY + Math.max(0, remainingScrollDist);
              minTablePosY -= remainingScrollDist;
            } else if (relScrollDistY < 0) {
              remainingScrollDist = relScrollDistY + Math.min(0, remainingScrollDist);
              maxTablePosY -= remainingScrollDist;
            } else {
              remainingScrollDist = 0;
            }

            scrollContrRef.current.prevSetY.remainingScrollDist = remainingScrollDist;
            scrollContrRef.current.prevSetY.timestamp = now;

            logSteps.push('5.4.1.3');
          }
        } else {
          // Step 5.4.2: if the given relative vertical scroll distance, subtracted from the
          // vertical translate value of the previously stored lead dataset is OUTSIDE of the
          // extended table range:
          // - estimate the next lead dataset index (by the previously stored lead dataset index, by
          //   the relative vertical scroll distance and by the average height of datasets),
          // - place it directly below the freezed datasets,
          // - don't move the scroll container.

          leadDatasetRef.current.idx = Math.max(
            0,
            Math.min(
              lastDatasetIdx,
              leadDatasetRef.current.idx + Math.ceil(relScrollDistY / averageDatasetHeight),
            ),
          );
          leadDatasetRef.current.posY = -scrollContrRef.current.translateY;
          logSteps.push('5.4.2');
        }
      }

      if (
        (relScrollDistY === 0)
        && shiftTable
        && ['oneDatasetUp', 'oneDatasetDown', 'pageUp', 'pageDown'].includes(shiftTable)
      ) {
        // Step 5.5: if additionally there is no scroll movement but a command to shift the table:
        // - move the scroll container further.

        switch (shiftTable) {
          case 'oneDatasetUp':
            isScrollMovementY = true;
            scrollContrRef.current.translateY += averageDatasetHeight;
            break;

          case 'oneDatasetDown': {
            isScrollMovementY = true;
            scrollContrRef.current.translateY -= averageDatasetHeight;
            break;
          }

          case 'pageUp':
            isScrollMovementY = true;
            scrollContrRef.current.translateY += ((nextAverageNumVisibleDatasets - 1) * averageDatasetHeight);
            break;

          case 'pageDown':
            isScrollMovementY = true;
            scrollContrRef.current.translateY -= ((nextAverageNumVisibleDatasets - 1) * averageDatasetHeight);
            break;

          // no default
        }

        logSteps.push('5.5');
      }

      prevsRef.current.scrollDistY = scrollDistY;
      leadDatasetRef.current.id = datasetIds[leadDatasetRef.current.idx];


      /**
       * Function to append datasets to the end of the array datasetsToRender, beginning with the
       * dataset of the given index at the given vertical position. The index of the new last
       * dataset in the array and the vertical position of the next dataset are returned as array.
       */
      const appendDatasetsToTheBottom = (givenFirstIdx, givenStartPosY) => {
        const maxPosY = maxTablePosY - scrollContrRef.current.translateY;
        let idx = givenFirstIdx,
          posY = givenStartPosY;

        while ((idx <= lastDatasetIdx) && (posY <= maxPosY)) {
          const datasetId = datasetIds[idx];
          const { totalHeight, gridTemplateRows } = getDatasetHeights(datasetId);
          const bottomLine = hasBottomLine(datasetId);

          datasetsToRender.push({
            datasetId,
            posY,
            height: totalHeight,
            gridTemplateRows,
            bottomLine,
          });

          posY += totalHeight;
          idx++;
        }

        return [(idx - 1), posY];
      };


      /**
       * Function to append datasets to the beginning of the array datasetsToRender, beginning with
       * the dataset of the given index. The index of the new first dataset in the array and its
       * vertical position are returned as array.
       */
      const appendDatasetsToTheTop = (givenFirstIdx, givenNextPosY) => {
        const minPosY = minTablePosY - scrollContrRef.current.translateY;
        let idx = givenFirstIdx,
          posY = givenNextPosY;

        while ((idx >= 0) && (posY >= minPosY)) {
          const datasetId = datasetIds[idx];
          const { totalHeight, gridTemplateRows } = getDatasetHeights(datasetId);
          const bottomLine = hasBottomLine(datasetId);

          posY -= totalHeight;

          datasetsToRender.unshift({
            datasetId,
            posY,
            height: totalHeight,
            gridTemplateRows,
            bottomLine,
          });

          idx--;
        }

        return [(idx + 1), posY];
      };


      // -------------------------------------------------------------------------------------------
      // Step 6: iterate from the lead dataset (including this one) towards the end of all datasets
      // until the extended height of the table is reached. Add these datasets to the array of
      // datasets-to-be-rendered.
      // -------------------------------------------------------------------------------------------

      firstIdx = leadDatasetRef.current.idx;
      startPosY = leadDatasetRef.current.posY;

      [lastIdx, nextPosY] = appendDatasetsToTheBottom(firstIdx, startPosY);
      logSteps.push('6');

      // -------------------------------------------------------------------------------------------
      // Step 7: if there are datasets before the lead dataset.
      // -------------------------------------------------------------------------------------------

      if (firstIdx > 0) {
        diffY = scrollableTableHeight - scrollContrRef.current.translateY - nextPosY;

        if (diffY > 0) {
          // Step 7.1: if the datasets-to-be-rendered that are captured above (in step 6) ends
          // within the vertically visible range of the table, move the datasets or the scroll
          // container to align the datasets at the bottom of the table.

          if (isScrollMovementY) {
            scrollContrRef.current.translateY += diffY;
          } else {
            const num = datasetsToRender.length;
            nextPosY += diffY;
            startPosY += diffY;

            for (let i = 0; i < num; i++) {
              datasetsToRender[i].posY += diffY;
            }
          }
          logSteps.push('7.1');
        }

        // Step 7.2: iterate from the lead dataset (excluding this one) towards the beginning of all
        // datasets until the extended height of the table is reached. Add these datasets to the
        // array of datasets-to-be-rendered.
        [firstIdx, startPosY] = appendDatasetsToTheTop(firstIdx - 1, startPosY);
        logSteps.push('7.2');
      }

      // -------------------------------------------------------------------------------------------
      // Step 8: adjust the vertical offset of the scroll container or the vertical offsets of the
      // datasets-to-render to fit the datasets correctly in the vertically visible range of the
      // table.
      // -------------------------------------------------------------------------------------------

      diffY = scrollContrRef.current.translateY + startPosY;

      if (diffY > 0) {
        // Step 8.1: if the first dataset to be rendered starts below the top of the table, move the
        // scroll container or the datasets-to-render to align the first dataset at the top of the
        // table. Fill up the extended height with further datasets.

        if (isScrollMovementY) {
          scrollContrRef.current.translateY -= diffY;
        } else {
          const num = datasetsToRender.length;
          startPosY -= diffY;
          nextPosY -= diffY;

          for (let i = 0; i < num; i++) {
            datasetsToRender[i].posY -= diffY;
          }
        }

        [lastIdx, nextPosY] = appendDatasetsToTheBottom(lastIdx + 1, nextPosY);
        logSteps.push('8.1');
      } else if (
        (diffY < 0)
        && ((scrollContrRef.current.translateY + nextPosY) < scrollableTableHeight)
      ) {
        // Step 8.2: if the first dataset to be rendered starts above the top of the table and the
        // last one ends within the vertically visible range of the table, move the scroll
        // container or the datasets-to-render to align the first dataset at the top of the table.

        diffY = Math.min(
          -diffY,
          scrollableTableHeight - scrollContrRef.current.translateY - nextPosY,
        );

        if (isScrollMovementY) {
          scrollContrRef.current.translateY += diffY;
        } else {
          const num = datasetsToRender.length;
          startPosY += diffY;
          nextPosY += diffY;

          for (let i = 0; i < num; i++) {
            datasetsToRender[i].posY += diffY;
          }
        }

        logSteps.push('8.2');
      }

      // -------------------------------------------------------------------------------------------
      // Step 9: finally adjust the vertical offset of the scroll container or the vertical offsets
      // of the datasets-to-render, if there is no scroll movement but an active dataset that has
      // changed (e.g. was selected by mouse or key).
      // -------------------------------------------------------------------------------------------

      if (
        (activeDatasetId !== null)
        && (activeDatasetId !== prevsRef.current.activeDatasetId)
        && (relScrollDistY === 0)
      ) {
        let idx = 0;

        diffY = null;

        // check if the active dataset is in the upper extended area
        while (datasetsToRender[idx].posY < -scrollContrRef.current.translateY) {
          if (datasetsToRender[idx].datasetId === activeDatasetId) {
            diffY = -scrollContrRef.current.translateY - datasetsToRender[idx].posY;
            break;
          }
          idx++;
        }

        if (diffY === null) {
          idx = datasetsToRender.length - 1;

          // check if the active dataset is in the lower extended area
          while ((datasetsToRender[idx].posY + datasetsToRender[idx].height) > (scrollableTableHeight - scrollContrRef.current.translateY)) {
            if (datasetsToRender[idx].datasetId === activeDatasetId) {
              diffY = scrollableTableHeight - scrollContrRef.current.translateY - datasetsToRender[idx].posY - datasetsToRender[idx].height;
              break;
            }
            idx--;
          }
        }

        if (diffY !== null) {
          if (isScrollMovementY) {
            scrollContrRef.current.translateY += diffY;
          } else {
            const num = datasetsToRender.length;

            for (let i = 0; i < num; i++) {
              datasetsToRender[i].posY += diffY;
            }
          }

          if (diffY > 0) {
            [firstIdx, startPosY] = appendDatasetsToTheTop(firstIdx - 1, startPosY);
          } else {
            [lastIdx, nextPosY] = appendDatasetsToTheBottom(lastIdx + 1, nextPosY);
          }

          logSteps.push('9');
        }
      }

      prevsRef.current.activeDatasetId = activeDatasetId;

      // -------------------------------------------------------------------------------------------
      // Step 10: determine the new lead dataset (ID, index and vertical translate value) that is
      // the first fully visible dataset on top of the table below the freezed datasets.
      // -------------------------------------------------------------------------------------------

      datasetsToRender.some((dataset) => {
        if ((dataset.posY + scrollContrRef.current.translateY) >= 0) {
          leadDatasetRef.current.id = dataset.datasetId;
          leadDatasetRef.current.idx = datasetIds.indexOf(dataset.datasetId);
          leadDatasetRef.current.posY = dataset.posY;
          return true;
        }
        return false;
      });
    } else {
      leadDatasetRef.current = getInitialLeadDatasetData();
    }

    // -------------------------------------------------------------------------------------------
    // Step 11:
    // -------------------------------------------------------------------------------------------

    const numDatasetsToRender = datasetsToRender.length;

    for (let i = 0; i < numDatasetsToRender; i++) {
      const dataset = datasetsToRender[i];

      for (let j = 0; j < visibleColumnGroups.num; j++) {
        const columnGroupId = visibleColumnGroups.allIds[j];
        const {
          gridTemplateColumns, posX, isFreezed, endLine,
        } = visibleColumnGroups.byId[columnGroupId];
        const gridTemplateAreas = getGridTemplateAreas(columnGroupId, dataset.datasetId);
        const cellsMetaData = getCellsMetaData(columnGroupId, dataset.datasetId);

        (isFreezed ? datasetPartsOfFreezedColumnGroups : datasetPartsOfScrollableColumnGroups).push({
          ...dataset,
          columnGroupId,
          cellsMetaData,
          posX,
          gridTemplateColumns,
          gridTemplateAreas,
          endLine,
        });
      }
    }


    // ---------------------------------------------------------------------------------------------
    // Step 12: estimate and derive some statistical values.
    // ---------------------------------------------------------------------------------------------

    if (numDatasetsToRender > 0) {
      const firstDataset = datasetsToRender[0];
      const lastDataset = datasetsToRender[numDatasetsToRender - 1];

      estScrollHeight = nextPosY - startPosY
        + ((numDatasets - lastIdx + firstIdx - 1) * averageDatasetHeight);
      estScrollTop = (firstIdx * averageDatasetHeight) - scrollContrRef.current.translateY - startPosY;

      nextVeryFirstDatasetId = (firstDataset.datasetId === datasetIds[0]) ? firstDataset.datasetId : null;
      nextVeryLastDatasetId = (lastDataset.datasetId === datasetIds[numDatasets - 1]) ? lastDataset.datasetId : null;
    }

    if (logging) {
      /* eslint-disable no-console */
      console.group(`TablePreparer deriveParamsForTable(${shiftTable ?? ''})`);
      console.log(`Steps: ${logSteps.join(' / ')}`);
      console.log(`Datasets to render: ${numDatasetsToRender} / ${datasetIds.length}, new lead dataset ID: ${leadDatasetRef.current.id}, index: ${leadDatasetRef.current.idx}`);
      console.log(`Move scroll container: ${isScrollMovementY ? scrollContrRef.current.translateY : 'No'}${isScrollMovementY ? 'px' : ''}`);
      console.groupEnd();
      /* eslint-enable no-console */
    }

    // ---------------------------------------------------------------------------------------------
    // Step 13: set the derived data to the state.
    // ---------------------------------------------------------------------------------------------

    setVeryFirstDatasetId(nextVeryFirstDatasetId);
    setVeryLastDatasetId(nextVeryLastDatasetId);
    setAverageNumVisibleDatasets(nextAverageNumVisibleDatasets);

    setParamsForTable({
      estScrollLeft: -scrollContrRef.current.translateX,
      estScrollWidth: scrollableColumnGroupsWidth,
      estScrollTop,
      estScrollHeight,
      isScrollMovementX,
      isScrollMovementY,
      translateX: scrollContrRef.current.translateX,
      translateY: scrollContrRef.current.translateY,
      freezedColumnGroupsWidth,
      freezedDatasetsTopHeight,
      freezedDatasetsBottomHeight,
      freezedDatasetPartsOfFreezedColumnGroups,
      freezedDatasetPartsOfScrollableColumnGroups,
      datasetPartsOfFreezedColumnGroups,
      datasetPartsOfScrollableColumnGroups,
    });
  }, [
    tableWidth, tableHeight, scrollDistX, scrollDistY, freezedColumnGroupIds, columnGroupIds,
    freezedDatasetIds, datasetIds, activeDatasetId, stayOnTop, expandTableTopBottomFactor,
    expandTableLeftRightFactor, columnGap, datasetPaddingLeft, datasetPaddingRight,
    getDatasetHeights, getColumnGroupWidths, getGridTemplateAreas, getCellsMetaData, hasEndLine,
    hasBottomLine, getAverageHeightOfAllDatasets, setFirstAndLastVisibleColumns, smoothScrolling,
  ]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    scroll: (shiftTable) => {
      deriveParamsForTable(shiftTable);
    },
    requestDatasets: (pos) => {
      onRequestDatasets(pos, averageNumVisibleDatasets, id);
    },
  }), [id, onRequestDatasets, averageNumVisibleDatasets, deriveParamsForTable]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  // Layout Effect to (re-)derive the parameters for the table. This is only done if:
  // - the memoized function deriveParamsForTable is created new due to changed dependencies, or
  // - if prop reset has changed from outside to force recalculation.
  useLayoutEffect(() => {
    const reset = (resetTable !== prevsRef.current.resetTable);

    readyToRequestDatasetsRef.current = true;

    if (reset || (deriveParamsForTable !== prevsRef.current.deriveParamsForTable)) {
      let shiftTable;

      if (reset) {
        // if the data table has to be resetted, delete all memoized data
        leadDatasetRef.current = getInitialLeadDatasetData();
        scrollContrRef.current = getInitialScrollContrData();
        prevsRef.current = getInitialPrevsData();
        initialDatasetsRequestedRef.current = false;

        // Assuming that there was a jump to the bottom of all datasets. In this case the using of
        // the shift commands ensures, that the datasets will correctly aligned to the bottom of the
        // table. In all other cases, the datasets will be aligned to the top of the table
        // automatically after a reset.
        if (
          (areDatasetsBefore && !areDatasetsAfter)
          || (activeDatasetId === datasetIds[datasetIds.length - 1])
        ) {
          shiftTable = 'toBottom';
        }
      } else {
        // If the data table has not to be resetted, prevent requesting datasets in the next effect.
        // This will be done automatically after rerendering due to (re-)derving the parameters.
        readyToRequestDatasetsRef.current = false;
      }

      prevsRef.current.resetTable = resetTable;
      prevsRef.current.deriveParamsForTable = deriveParamsForTable;

      deriveParamsForTable(shiftTable);
    }
  });


  // Effect to conditionally start the requests of new datasets.
  useEffect(() => {
    if (
      readyToRequestDatasetsRef.current
      && (tableWidth > 0)
      && (tableHeight > 0)
      && (averageNumVisibleDatasets > 0)
    ) {
      if (datasetIds.length === 0) {
        if (!initialDatasetsRequestedRef.current && (areDatasetsBefore || areDatasetsAfter)) {
          // do an initial dataset request (if not done right before), if there are no datasets
          // queried (before or due to filter settings), but if there are datasets available at the
          // server
          onRequestDatasets('initial', averageNumVisibleDatasets, id);
          initialDatasetsRequestedRef.current = true;
        }
      } else {
        // ...
        if (
          areDatasetsBefore
          && (veryFirstDatasetId !== null)
          && (veryFirstDatasetId !== prevsRef.current.veryFirstDatasetId)
        ) {
          onRequestDatasets('before', averageNumVisibleDatasets, id);
          prevsRef.current.veryFirstDatasetId = veryFirstDatasetId;
        } else if (!areDatasetsBefore || (veryFirstDatasetId === null)) {
          prevsRef.current.veryFirstDatasetId = null;
        }

        if (
          areDatasetsAfter
          && (veryLastDatasetId !== null)
          && (veryLastDatasetId !== prevsRef.current.veryLastDatasetId)
        ) {
          onRequestDatasets('after', averageNumVisibleDatasets, id);
          prevsRef.current.veryLastDatasetId = veryLastDatasetId;
        } else if (!areDatasetsAfter || (veryLastDatasetId === null)) {
          prevsRef.current.veryLastDatasetId = null;
        }

        // now be ready for an initial request, if there are no datasets again (e.g. due to filter
        // settings)
        initialDatasetsRequestedRef.current = false;
      }
    }
  });


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <ContextCellMeasurer.Provider value={funcsForContext}>
      {children(paramsForTable)}
    </ContextCellMeasurer.Provider>
  );
  //                                                                                  </editor-fold>
});

TablePreparer.displayName = 'TablePreparer';

TablePreparer.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  tableWidth: PropTypes.number,
  tableHeight: PropTypes.number,
  scrollDistX: PropTypes.number,
  scrollDistY: PropTypes.number,
  columns: PropTypes.oneOfType([PropTypes.func, PropTypes.arrayOf(PropTypes.shape({
    width: PropTypes.number,
    autoWidth: PropTypes.oneOf([false, true, 'minContent']),
    hidden: PropTypes.bool,
  }))]).isRequired,
  datasetLayout: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({
    id: PropTypes.string.isRequired,
    rows: PropTypes.arrayOf(PropTypes.shape({
      height: PropTypes.number,
      autoHeight: PropTypes.oneOf([false, true, 'minContent']),
      hidden: PropTypes.bool,
      cells: PropTypes.oneOfType([PropTypes.func, PropTypes.arrayOf(PropTypes.string)]).isRequired,
    })).isRequired,
    addHeight: PropTypes.number,
    noBottomLine: PropTypes.bool,
  })]).isRequired,
  freezedColumnGroupIds: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  columnGroupIds: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  freezedDatasetIds: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
    PropTypes.shape({
      top: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
      bottom: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
    }),
  ]),
  datasetIds: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  activeDatasetId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  areDatasetsBefore: PropTypes.bool,
  areDatasetsAfter: PropTypes.bool,
  onRequestDatasets: PropTypes.func,
  stayOnTop: PropTypes.bool,
  resetTable: PropTypes.any, // eslint-disable-line react/forbid-prop-types
  expandTableTopBottomFactor: PropTypes.number,
  expandTableLeftRightFactor: PropTypes.number,
  defaultColumnWidth: PropTypes.number,
  defaultRowHeight: PropTypes.number,
  columnGap: PropTypes.number,
  datasetPaddingLeft: PropTypes.number,
  datasetPaddingRight: PropTypes.number,
  defaultAverageDatasetHeight: PropTypes.number,
  smoothScrolling: PropTypes.bool,
  children: PropTypes.func,
};

TablePreparer.defaultProps = {
  id: '',
  tableWidth: 0,
  tableHeight: 0,
  scrollDistX: 0,
  scrollDistY: 0,
  freezedColumnGroupIds: [],
  columnGroupIds: [],
  freezedDatasetIds: [],
  datasetIds: [],
  activeDatasetId: null,
  areDatasetsBefore: false,
  areDatasetsAfter: false,
  onRequestDatasets() {},
  stayOnTop: false,
  resetTable: null,
  expandTableTopBottomFactor: 0,
  expandTableLeftRightFactor: 0,
  defaultColumnWidth: 0,
  defaultRowHeight: 0,
  columnGap: 0,
  datasetPaddingLeft: 0,
  datasetPaddingRight: 0,
  defaultAverageDatasetHeight: 0,
  smoothScrolling: false,
  children() {},
};

export { useCellMeasurer };
export default TablePreparer;
