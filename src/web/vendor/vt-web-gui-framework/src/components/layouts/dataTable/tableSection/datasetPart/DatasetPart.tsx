import { useContext } from 'react';

import { color, getGround, spacePx } from 'assets/styles';
import type { GroundStyle } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';

import { DataTablePropsContext } from '../../dataTablePropsContext';

import * as css from './datasetPart.scss';
import type { DatasetPartProps } from './datasetPart.types';
import { InnerDatasetPart } from './innerDatasetPart/InnerDatasetPart';


/**
 * React component of a partial dataset for a column group of the data table (component DataTable).
 */
const DatasetPart = ({
  columnGroupId, datasetId, posX, posY, isRtl, gridTemplateRows, gridTemplateColumns,
  gridTemplateAreas, topLine, bottomLine, endLine, cellsMetaData,
}: DatasetPartProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const {
    tableId, datasetPartIterator, columnGap, datasetPaddingLeft, datasetPaddingRight,
  } = useContext(DataTablePropsContext);


  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const {
    cellIterator, hasFocus, backgroundColor, onClick,
  } = datasetPartIterator?.({ tableId, columnGroupId, datasetId }) ?? {};

  const isClickable = (typeof onClick === 'function');
  const endLinePaddingPx = (endLine && datasetPaddingLeft && datasetPaddingRight)
    ? spacePx[isRtl ? datasetPaddingLeft : datasetPaddingRight]
    : false;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for synthetic React mouse event "onClick" on the dataset part element.
   */
  const handleClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    onClick?.({
      tableId, columnGroupId, datasetId, event,
    });
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!cellIterator) {
    return null;
  }


  const datasetPartClasses = classNames(css.datasetPart, {
    [css.topLine]: topLine,
    [css.bottomLine]: bottomLine,
    [css.hasFocus]: hasFocus,
    [css.clickable]: isClickable,
  });

  // A dataset with a colour of its own is the ground of the cells on it, so it sets the ground that
  // colour makes beside the colour.
  const ground = backgroundColor && getGround(backgroundColor);
  const datasetPartStyle: GroundStyle = {
    ...(backgroundColor && { background: color[backgroundColor] }),
    ...(ground && { '--ground': ground }),
    ...(datasetPaddingLeft && { paddingLeft: spacePx[datasetPaddingLeft] }),
    ...(datasetPaddingRight && { paddingRight: spacePx[datasetPaddingRight] }),
    transform: `translate(${posX}px, ${posY}px)`,
  };

  return (
    <div
      className={datasetPartClasses}
      style={datasetPartStyle}
      {...(isClickable && { onClick: handleClick })}
    >
      <InnerDatasetPart
        tableId={tableId}
        columnGroupId={columnGroupId}
        datasetId={datasetId}
        isRtl={isRtl}
        gridTemplateRows={gridTemplateRows}
        gridTemplateColumns={gridTemplateColumns}
        gridTemplateAreas={gridTemplateAreas}
        columnGap={columnGap ? spacePx[columnGap] : '0px'}
        endLine={endLinePaddingPx}
        cellIterator={cellIterator}
        cellsMetaData={cellsMetaData}
      />
    </div>
  );
  //                                                                                  </editor-fold>
};

DatasetPart.displayName = 'DatasetPart';


export { DatasetPart };
