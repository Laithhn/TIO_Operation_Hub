import {
  useImperativeHandle, useMemo, useRef, useState,
} from 'react';

import { layout, space } from 'assets/styles';
import { Button, buttonDim } from 'components/controls/button';
import { ScrollBar, type ScrollBarProps } from 'components/helpers/scrollBar';
import { SizeMeasurer } from 'components/helpers/sizeMeasurer';
import { TablePreparer, type TablePreparerHandle } from 'components/helpers/tablePreparer';
import { useI18n } from 'components/hooks/useI18n';
import { useScrollHandlers } from 'components/hooks/useScrollHandlers';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';

import * as css from './dataTable.scss';
import { type DataTableProps, dataTableStylingProps, type PropsForContext } from './dataTable.types';
import { DataTablePropsContext } from './dataTablePropsContext';
import { TableSection } from './tableSection/TableSection';


const horizontalPositionNaviButtonsInside = (layout.scrolling.scrollBarThickness - buttonDim) / 2;
const horizontalPositionNaviButtonsOutside = horizontalPositionNaviButtonsInside - layout.scrolling.scrollBarThickness;


/**
 *
 */
const DataTable = ({
  ref, id, tabBarItemId = '', columns, datasetLayout, freezedColumnGroupIds, columnGroupIds,
  freezedDatasetIds, datasetIds, activeDatasetId = null, areDatasetsBefore = false,
  areDatasetsAfter = false, datasetPartIterator, stayOnTop = false, resetTable = null,
  expandTableTopBottomFactor = 0.3, expandTableLeftRightFactor = 0.3,
  defaultColumnWidth = space.xxl, defaultRowHeight = space.large, columnGap,
  datasetPaddingLeft = 'small', datasetPaddingRight = 'small',
  defaultAverageDatasetHeight = space.large, smoothScrolling = false,
  verticalScrollBarHandleAtStartDir = false, verticalScrollBarHandleOutside = false,
  horizontalScrollBarHandleOutside = false, showNaviButtons = false, naviButtonsVerticalOffset = 0,
  onRequestDatasets, ...restProps
}: DataTableProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = useI18n();

  const [scrollDistH, setScrollDistH] = useState(0);
  const [scrollDistV, setScrollDistV] = useState(0);

  const tablePreparerRef = useRef<TablePreparerHandle>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { elemStyle } = useStylingProps(restProps, dataTableStylingProps, { addCombinedStyle: true });
  const addScrollBarOffset = buttonDim + naviButtonsVerticalOffset + 2;
  let showTopNaviButton = false,
    showBottomNaviButton = false;

  const horizontalSideNaviButtons = (verticalScrollBarHandleAtStartDir !== isRtl) ? 'left' : 'right';
  const horizontalPositionNaviButtons = {
    [horizontalSideNaviButtons]: verticalScrollBarHandleOutside
      ? horizontalPositionNaviButtonsOutside
      : horizontalPositionNaviButtonsInside,
  };

  if (showNaviButtons && datasetIds && (datasetIds.length > 0)) {
    showTopNaviButton = areDatasetsBefore && !stayOnTop;
    showBottomNaviButton = areDatasetsAfter;
  }


  // Collect some props from the data table to provide them via React context to sub components. It
  // keeps its useMemo because it is a context value, which react/jsx-no-constructed-context-values
  // asks to be memoized. That rule knows nothing of the React Compiler, and it reads only the form
  // "<Context.Provider value>", so it misses the React 19 form used below - the case is the same.
  const propsForContext = useMemo<PropsForContext>(() => ({
    tableId: id,
    datasetPartIterator,
    columnGap,
    datasetPaddingLeft,
    datasetPaddingRight,
  }), [id, datasetPartIterator, columnGap, datasetPaddingLeft, datasetPaddingRight]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    scrollToTop: () => {
      tablePreparerRef.current?.scroll('toTop');
    },
    scrollToBottom: () => {
      tablePreparerRef.current?.scroll('toBottom');
    },
    scrollOneDatasetUp: () => {
      tablePreparerRef.current?.scroll('oneDatasetUp');
    },
    scrollOneDatasetDown: () => {
      tablePreparerRef.current?.scroll('oneDatasetDown');
    },
    scrollPageUp: () => {
      tablePreparerRef.current?.scroll('pageUp');
    },
    scrollPageDown: () => {
      tablePreparerRef.current?.scroll('pageDown');
    },
  }), []);


  /**
   *
   */
  const scrollHandlersProps = useScrollHandlers<HTMLDivElement>({
    enableWheel: true,
    enableTouch: true,
    onChangeX: ({ diff }) => {
      setScrollDistH((prevValue) => prevValue + diff);
    },
    onChangeY: ({ diff }) => {
      setScrollDistV((prevValue) => prevValue + diff);
    },
  });


  /**
   * Handler for event "onScroll" of the horizontal scroll bar handle to set the horizontal scroll
   * distance by moving it.
   */
  const handleScrollH: NonNullable<ScrollBarProps['onScroll']> = ({ scrollDiff }) => {
    setScrollDistH((prevValue) => prevValue + scrollDiff);
  };


  /**
   * Handler for event "onScroll" of the vertical scroll bar handle to set the vertical
   * scroll distance by moving it.
   */
  const handleScrollV: NonNullable<ScrollBarProps['onScroll']> = ({ scrollDiff }) => {
    setScrollDistV((prevValue) => prevValue + scrollDiff);
  };


  /**
   * Handler for event "click" on the to-top overlaid button to request the first datasets.
   */
  const handleClickToTop = () => {
    tablePreparerRef.current?.requestDatasets('top');
  };


  /**
   * Handler for event "click" on the to-bottom overlaid button to request the last datasets.
   */
  const handleClickToBottom = () => {
    tablePreparerRef.current?.requestDatasets('bottom');
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <div
      {...(id && { id })}
      {...(tabBarItemId && { role: 'tabpanel', 'aria-labelledby': tabBarItemId })}
      className={classNames(css.dataTable, { [css.contactPane]: (restProps.boxShadow === 'contact') })}
      style={elemStyle}
      {...scrollHandlersProps}
    >
      <SizeMeasurer className={css.innerContr}>
        {({ clientWidth, clientHeight }) => (
          <TablePreparer
            ref={tablePreparerRef}
            tableWidth={clientWidth ?? 0}
            tableHeight={clientHeight ?? 0}
            scrollDistX={scrollDistH}
            scrollDistY={scrollDistV}
            columns={columns}
            datasetLayout={datasetLayout}
            {...(freezedColumnGroupIds && { freezedColumnGroupIds })}
            {...(columnGroupIds && { columnGroupIds })}
            {...(freezedDatasetIds && { freezedDatasetIds })}
            {...(datasetIds && { datasetIds })}
            activeDatasetId={activeDatasetId}
            areDatasetsBefore={areDatasetsBefore}
            areDatasetsAfter={areDatasetsAfter}
            stayOnTop={stayOnTop}
            resetTable={resetTable}
            expandTableTopBottomFactor={expandTableTopBottomFactor}
            expandTableLeftRightFactor={expandTableLeftRightFactor}
            defaultColumnWidth={defaultColumnWidth}
            defaultRowHeight={defaultRowHeight}
            {...(columnGap && { columnGap })}
            {...(datasetPaddingLeft && { datasetPaddingLeft })}
            {...(datasetPaddingRight && { datasetPaddingRight })}
            defaultAverageDatasetHeight={defaultAverageDatasetHeight}
            smoothScrolling={smoothScrolling}
            {...(onRequestDatasets && { onRequestDatasets })}
          >
            {({
              estScrollLeft, estScrollWidth, estScrollTop, estScrollHeight, isScrollMovementX,
              isScrollMovementY, translateX, translateY, freezedColumnGroupsWidth,
              freezedDatasetsTopHeight, freezedDatasetsBottomHeight,
              freezedDatasetPartsOfFreezedColumnGroups, freezedDatasetPartsOfScrollableColumnGroups,
              datasetPartsOfFreezedColumnGroups, datasetPartsOfScrollableColumnGroups,
            }) => {
              const isSmoothScrollingX = smoothScrolling && isScrollMovementX;
              const isSmoothScrollingY = smoothScrolling && isScrollMovementY;

              return (
                <DataTablePropsContext value={propsForContext}>
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
                        smoothScrolling={isSmoothScrollingY}
                      >
                        {datasetPartsOfFreezedColumnGroups}
                      </TableSection>
                    </>
                  )}
                  {/* freezed datasets (top and bottom) of horizontal scrollable column groups */}
                  <TableSection left={freezedColumnGroupsWidth} translateX={translateX} smoothScrolling={smoothScrolling}>
                    {freezedDatasetPartsOfScrollableColumnGroups}
                  </TableSection>
                  {/* vertical scrollable datasets of horizontal scrollable column groups */}
                  <TableSection
                    left={freezedColumnGroupsWidth}
                    top={freezedDatasetsTopHeight}
                    bottom={freezedDatasetsBottomHeight}
                    translateX={translateX}
                    translateY={translateY}
                    smoothScrolling={isSmoothScrollingX || isSmoothScrollingY}
                  >
                    {datasetPartsOfScrollableColumnGroups}
                  </TableSection>
                  <ScrollBar
                    dir="horizontal"
                    dimVisible={clientWidth ?? 0}
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
                      type="overlaid"
                      {...horizontalPositionNaviButtons}
                      top={freezedDatasetsTopHeight + naviButtonsVerticalOffset}
                      icon="NAVITOP"
                      onClick={handleClickToTop}
                    />
                  )}
                  <ScrollBar
                    dir={verticalScrollBarHandleAtStartDir ? 'verticalStart' : 'verticalEnd'}
                    dimVisible={clientHeight ?? 0}
                    dimTotal={estScrollHeight}
                    dimOffset={freezedDatasetsTopHeight}
                    dimOffsetEnd={freezedDatasetsBottomHeight}
                    scrollOffset={estScrollTop}
                    scrollBarOffset={freezedDatasetsTopHeight + (showTopNaviButton ? addScrollBarOffset : 0)}
                    scrollBarOffsetEnd={freezedDatasetsBottomHeight + (showBottomNaviButton ? addScrollBarOffset : 0)}
                    smoothScrolling={isSmoothScrollingY}
                    handleOutside={verticalScrollBarHandleOutside}
                    onScroll={handleScrollV}
                  />
                  {showBottomNaviButton && (
                    <Button
                      type="overlaid"
                      {...horizontalPositionNaviButtons}
                      bottom={freezedDatasetsBottomHeight + naviButtonsVerticalOffset}
                      icon="NAVIBOTTOM"
                      onClick={handleClickToBottom}
                    />
                  )}
                </DataTablePropsContext>
              );
            }}
          </TablePreparer>
        )}
      </SizeMeasurer>
    </div>
  );
  //                                                                                  </editor-fold>
};

DataTable.displayName = 'DataTable';


export { DataTable };
