import PropTypes from 'prop-types';
import {
  memo, forwardRef, useState, useRef, useMemo, useImperativeHandle, useCallback,
} from 'react';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import Button, { ButtonType, buttonDefines } from 'components/controls/button';
import { ScrollBar, ScrollBarDir, useScrollHandlers } from 'components/helpers/scrolling';
import SizeMeasurer from 'components/helpers/sizeMeasurer';
import TablePreparer from 'components/helpers/tablePreparer';
import useStylingProps from 'components/hooks/useStylingProps';
import { hooks } from 'store';

import ColumnsSelectionCard from './columnsSelectionCard';
import ContextDataTableProps from './contextDataTableProps';
import TableSection from './tableSection';
import css from './dataTable.scss';
import dataTableDefines from './defines';
import { DataTableCellType, DataTableSortOrder } from './enums';
import stylingProps from './stylingProps';


const horizontalPositionNaviButtonsInside = (defines.layout.scrollBarThickness - buttonDefines.overlayedButtons.dim) / 2;
const horizontalPositionNaviButtonsOutside = horizontalPositionNaviButtonsInside - defines.layout.scrollBarThickness;


/**
 * Memoized React component of a universal data table.
 */
const DataTable = memo(forwardRef(({
  id, columns, datasetLayout, freezedColumnGroupIds, columnGroupIds, freezedDatasetIds, datasetIds,
  activeDatasetId, areDatasetsBefore, areDatasetsAfter, onRequestDatasets, datasetIterator,
  datasetPartIterator, stayOnTop, resetTable, expandTableTopBottomFactor,
  expandTableLeftRightFactor, defaultColumnWidth, defaultRowHeight, columnGap, datasetPaddingLeft,
  datasetPaddingRight, defaultAverageDatasetHeight, smoothScrolling,
  verticalScrollBarHandleAtStartDir, verticalScrollBarHandleOutside,
  horizontalScrollBarHandleOutside, showNaviButtons, naviButtonsVerticalOffset, ...restProps
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = hooks.useI18n();

  const [scrollDistH, setScrollDistH] = useState(0);
  const [scrollDistV, setScrollDistV] = useState(0);

  const tablePreparerRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { elemStyle } = useStylingProps(restProps, stylingProps, { addCombinedStyle: true });
  const addScrollBarOffset = buttonDefines.overlayedButtons.dim + naviButtonsVerticalOffset + 2;
  let showTopNaviButton = false,
    showBottomNaviButton = false;

  const horizontalPositionNaviButtons = {
    [(verticalScrollBarHandleAtStartDir !== isRtl) ? 'left' : 'right']: verticalScrollBarHandleOutside
      ? horizontalPositionNaviButtonsOutside
      : horizontalPositionNaviButtonsInside,
  };

  if (showNaviButtons && (datasetIds.length > 0)) {
    showTopNaviButton = areDatasetsBefore && !stayOnTop;
    showBottomNaviButton = areDatasetsAfter;
  }


  // Collect ... to provide them via React context to ...
  // Deprecated: the datasetIterator has to be removed in next major version and fully replaced by the datasetPartIterator
  const propsForContext = useMemo(() => ({
    tableId: id,
    datasetIterator,
    datasetPartIterator,
    columnGap,
    datasetPaddingLeft,
    datasetPaddingRight,
  }), [id, datasetIterator, datasetPartIterator, columnGap, datasetPaddingLeft, datasetPaddingRight]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    resetColumns: () => {
      // Deprecated: is not longer used, will be deleted at the next major version
    },
    scrollToTop: () => {
      if (tablePreparerRef.current) tablePreparerRef.current.scroll('toTop');
    },
    scrollToBottom: () => {
      if (tablePreparerRef.current) tablePreparerRef.current.scroll('toBottom');
    },
    scrollOneDatasetUp: () => {
      if (tablePreparerRef.current) tablePreparerRef.current.scroll('oneDatasetUp');
    },
    scrollOneDatasetDown: () => {
      if (tablePreparerRef.current) tablePreparerRef.current.scroll('oneDatasetDown');
    },
    scrollPageUp: () => {
      if (tablePreparerRef.current) tablePreparerRef.current.scroll('pageUp');
    },
    scrollPageDown: () => {
      if (tablePreparerRef.current) tablePreparerRef.current.scroll('pageDown');
    },
  }), []);


  /**
   *
   */
  const scrollHandlersProps = useScrollHandlers({
    enableWheel: true,
    enableTouch: true,
    onChangeX: useCallback((delta) => {
      setScrollDistH((prevValue) => prevValue + delta);
    }, []),
    onChangeY: useCallback((delta) => {
      setScrollDistV((prevValue) => prevValue + delta);
    }, []),
  });


  /**
   * Memoized handler for event "onScroll" of the horizontal scroll bar handle to set the horizontal
   * scroll distance by moving it.
   */
  const handleScrollH = useCallback((pos, movement) => {
    setScrollDistH((prevValue) => prevValue + movement);
  }, []);


  /**
   * Memoized handler for event "onScroll" of the vertical scroll bar handle to set the vertical
   * scroll distance by moving it.
   */
  const handleScrollV = useCallback((pos, movement) => {
    setScrollDistV((prevValue) => prevValue + movement);
  }, []);


  /**
   * Memoized handler for event "click" on the to-top or to-bottom overlayed button to request the
   * first or last datasets.
   */
  const handleClickButton = useCallback((buttonId) => {
    switch (buttonId) {
      case 'toTop':
        tablePreparerRef.current.requestDatasets('top');
        break;

      case 'toBottom':
        tablePreparerRef.current.requestDatasets('bottom');
        break;

      // no default
    }
  }, []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <div className={css.dataTable} style={elemStyle} {...scrollHandlersProps}>
      <SizeMeasurer className={css.innerContr}>
        {({ clientWidth, clientHeight }) => (
          <TablePreparer
            ref={tablePreparerRef}
            id={id}
            tableWidth={clientWidth}
            tableHeight={clientHeight}
            scrollDistX={scrollDistH}
            scrollDistY={scrollDistV}
            columns={columns}
            datasetLayout={datasetLayout}
            freezedColumnGroupIds={freezedColumnGroupIds}
            columnGroupIds={columnGroupIds}
            freezedDatasetIds={freezedDatasetIds}
            datasetIds={datasetIds}
            activeDatasetId={activeDatasetId}
            areDatasetsBefore={areDatasetsBefore}
            areDatasetsAfter={areDatasetsAfter}
            onRequestDatasets={onRequestDatasets}
            stayOnTop={stayOnTop}
            resetTable={resetTable}
            expandTableTopBottomFactor={expandTableTopBottomFactor}
            expandTableLeftRightFactor={expandTableLeftRightFactor}
            defaultColumnWidth={defaultColumnWidth}
            defaultRowHeight={defaultRowHeight}
            columnGap={columnGap.value}
            datasetPaddingLeft={datasetPaddingLeft.value}
            datasetPaddingRight={datasetPaddingRight.value}
            defaultAverageDatasetHeight={defaultAverageDatasetHeight}
            smoothScrolling={smoothScrolling}
          >
            {({
              estScrollLeft, estScrollWidth, estScrollTop, estScrollHeight, isScrollMovementX,
              isScrollMovementY, translateX, translateY, freezedColumnGroupsWidth,
              freezedDatasetsTopHeight, freezedDatasetsBottomHeight,
              freezedDatasetPartsOfFreezedColumnGroups, freezedDatasetPartsOfScrollableColumnGroups,
              datasetPartsOfFreezedColumnGroups, datasetPartsOfScrollableColumnGroups,
            }) => (
              <ContextDataTableProps.Provider value={propsForContext}>
                {(freezedColumnGroupsWidth > 0) && (
                  <>
                    {/* freezed datasets (top and bottom) of freezed column groups */}
                    <TableSection>
                      {freezedDatasetPartsOfFreezedColumnGroups}
                    </TableSection>
                    {/* vertical scrollable datasets of freezed column groups */}
                    <TableSection
                      top={freezedDatasetsTopHeight}
                      bottom={freezedDatasetsBottomHeight}
                      translateY={translateY}
                      smoothScrolling={smoothScrolling && isScrollMovementY}
                    >
                      {datasetPartsOfFreezedColumnGroups}
                    </TableSection>
                  </>
                )}
                {/* freezed datasets (top and bottom) of horizontal scrollable column groups */}
                <TableSection
                  left={freezedColumnGroupsWidth}
                  translateX={translateX}
                  smoothScrolling={smoothScrolling}
                >
                  {freezedDatasetPartsOfScrollableColumnGroups}
                </TableSection>
                {/* vertical scrollable datasets of horizontal scrollable column groups */}
                <TableSection
                  left={freezedColumnGroupsWidth}
                  top={freezedDatasetsTopHeight}
                  bottom={freezedDatasetsBottomHeight}
                  translateX={translateX}
                  translateY={translateY}
                  smoothScrolling={smoothScrolling && (isScrollMovementX || isScrollMovementY)}
                >
                  {datasetPartsOfScrollableColumnGroups}
                </TableSection>
                <ScrollBar
                  dir={ScrollBarDir.HORIZONTAL}
                  dimVisible={clientWidth}
                  dimTotal={estScrollWidth}
                  dimOffset={freezedColumnGroupsWidth}
                  scrollOffset={estScrollLeft}
                  scrollBarOffset={freezedColumnGroupsWidth}
                  smoothScrolling={smoothScrolling}
                  handleOutside={horizontalScrollBarHandleOutside}
                  onScroll={handleScrollH}
                />
                {showTopNaviButton && (
                  <Button
                    id="toTop"
                    type={ButtonType.OVERLAYED}
                    {...horizontalPositionNaviButtons}
                    top={freezedDatasetsTopHeight + naviButtonsVerticalOffset}
                    icon="NAVITOP"
                    onClick={handleClickButton}
                  />
                )}
                <ScrollBar
                  dir={verticalScrollBarHandleAtStartDir ? ScrollBarDir.VERTICAL_START : ScrollBarDir.VERTICAL_END}
                  dimVisible={clientHeight}
                  dimTotal={estScrollHeight}
                  dimOffset={freezedDatasetsTopHeight}
                  dimOffsetEnd={freezedDatasetsBottomHeight}
                  scrollOffset={estScrollTop}
                  scrollBarOffset={freezedDatasetsTopHeight + (showTopNaviButton ? addScrollBarOffset : 0)}
                  scrollBarOffsetEnd={freezedDatasetsBottomHeight + (showBottomNaviButton ? addScrollBarOffset : 0)}
                  smoothScrolling={smoothScrolling && isScrollMovementY}
                  handleOutside={verticalScrollBarHandleOutside}
                  onScroll={handleScrollV}
                />
                {showBottomNaviButton && (
                  <Button
                    id="toBottom"
                    type={ButtonType.OVERLAYED}
                    {...horizontalPositionNaviButtons}
                    bottom={freezedDatasetsBottomHeight + naviButtonsVerticalOffset}
                    icon="NAVIBOTTOM"
                    onClick={handleClickButton}
                  />
                )}
              </ContextDataTableProps.Provider>
            )}
          </TablePreparer>
        )}
      </SizeMeasurer>
    </div>
  );
  //                                                                                  </editor-fold>
}));

DataTable.displayName = 'DataTable';

DataTable.propTypes = {
  id: TablePreparer.propTypes.id,
  columns: TablePreparer.propTypes.columns,
  datasetLayout: TablePreparer.propTypes.datasetLayout,
  freezedColumnGroupIds: TablePreparer.propTypes.freezedColumnGroupIds,
  columnGroupIds: TablePreparer.propTypes.columnGroupIds,
  freezedDatasetIds: TablePreparer.propTypes.freezedDatasetIds,
  datasetIds: TablePreparer.propTypes.datasetIds,
  activeDatasetId: TablePreparer.propTypes.activeDatasetId,
  areDatasetsBefore: TablePreparer.propTypes.areDatasetsBefore,
  areDatasetsAfter: TablePreparer.propTypes.areDatasetsAfter,
  onRequestDatasets: TablePreparer.propTypes.onRequestDatasets,
  datasetIterator: PropTypes.func,
  datasetPartIterator: PropTypes.func,
  stayOnTop: TablePreparer.propTypes.stayOnTop,
  resetTable: TablePreparer.propTypes.resetTable,
  expandTableTopBottomFactor: TablePreparer.propTypes.expandTableTopBottomFactor,
  expandTableLeftRightFactor: TablePreparer.propTypes.expandTableLeftRightFactor,
  defaultColumnWidth: TablePreparer.propTypes.defaultColumnWidth,
  defaultRowHeight: TablePreparer.propTypes.defaultRowHeight,
  columnGap: PropTypes.instanceOf(Enums.GapAndPadding),
  datasetPaddingLeft: PropTypes.instanceOf(Enums.GapAndPadding),
  datasetPaddingRight: PropTypes.instanceOf(Enums.GapAndPadding),
  defaultAverageDatasetHeight: TablePreparer.propTypes.defaultAverageDatasetHeight,
  smoothScrolling: TablePreparer.propTypes.smoothScrolling,
  verticalScrollBarHandleAtStartDir: PropTypes.bool,
  verticalScrollBarHandleOutside: PropTypes.bool,
  horizontalScrollBarHandleOutside: PropTypes.bool,
  showNaviButtons: PropTypes.bool,
  naviButtonsVerticalOffset: PropTypes.number,
};

DataTable.defaultProps = {
  id: TablePreparer.defaultProps.id,
  columns: TablePreparer.defaultProps.columns,
  datasetLayout: TablePreparer.defaultProps.datasetLayout,
  freezedColumnGroupIds: TablePreparer.defaultProps.freezedColumnGroupIds,
  columnGroupIds: TablePreparer.defaultProps.columnGroupIds,
  freezedDatasetIds: TablePreparer.defaultProps.freezedDatasetIds,
  datasetIds: TablePreparer.defaultProps.datasetIds,
  activeDatasetId: TablePreparer.defaultProps.activeDatasetId,
  areDatasetsBefore: TablePreparer.defaultProps.areDatasetsBefore,
  areDatasetsAfter: TablePreparer.defaultProps.areDatasetsAfter,
  onRequestDatasets: TablePreparer.defaultProps.onRequestDatasets,
  datasetIterator() {},
  datasetPartIterator: null,
  stayOnTop: TablePreparer.defaultProps.stayOnTop,
  resetTable: TablePreparer.defaultProps.resetTable,
  expandTableTopBottomFactor: dataTableDefines.dataTable.expandTableTopBottomFactor,
  expandTableLeftRightFactor: dataTableDefines.dataTable.expandTableLeftRightFactor,
  defaultColumnWidth: dataTableDefines.dataTable.defaultColumnWidth,
  defaultRowHeight: dataTableDefines.dataTable.defaultRowHeight,
  columnGap: Enums.GapAndPadding.NONE,
  datasetPaddingLeft: Enums.GapAndPadding.enumValues.find((obj) => (obj.value === dataTableDefines.datasetPart.paddingLeft)) || Enums.GapAndPadding.NONE,
  datasetPaddingRight: Enums.GapAndPadding.enumValues.find((obj) => (obj.value === dataTableDefines.datasetPart.paddingRight)) || Enums.GapAndPadding.NONE,
  defaultAverageDatasetHeight: dataTableDefines.dataTable.defaultAverageDatasetHeight,
  smoothScrolling: TablePreparer.defaultProps.smoothScrolling,
  verticalScrollBarHandleAtStartDir: false,
  verticalScrollBarHandleOutside: false,
  horizontalScrollBarHandleOutside: false,
  showNaviButtons: false,
  naviButtonsVerticalOffset: 0,
};

export { DataTableCellType, DataTableSortOrder, ColumnsSelectionCard };
export default DataTable;
