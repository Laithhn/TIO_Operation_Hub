import PropTypes from 'prop-types';
import { memo, useContext } from 'react';

import classNames from 'utils/classNames';

import ContextDataTableProps from '../../contextDataTableProps';
import InnerDatasetPart from './innerDatasetPart';
import css from './datasetPart.scss';


/**
 * Memoized React component of a partial dataset for a column group of the data table (component
 * DataTable).
 */
const DatasetPart = memo(({
  isRtl, columnGroupId, datasetId, cellsMetaData, posX, posY, gridTemplateRows, gridTemplateColumns,
  gridTemplateAreas, topLine, bottomLine, endLine,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const {
    tableId, datasetIterator, datasetPartIterator, columnGap, datasetPaddingRight,
    datasetPaddingLeft,
  } = useContext(ContextDataTableProps);


  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // Deprecated: at next major version, only the new datasetPartIterator is used. The old one has to
  //  be deleted.
  const isDatasetPartIterator = (typeof datasetPartIterator === 'function');
  const {
    cellIterator, hasFocus, backgroundColor, onClick,
  } = isDatasetPartIterator
    ? datasetPartIterator({ tableId, columnGroupId, datasetId })
    : datasetIterator(datasetId, tableId);

  const isClickable = (typeof onClick === 'function');
  let modEndLine = false;

  if (endLine) {
    modEndLine = isRtl ? datasetPaddingLeft.value : datasetPaddingRight.value;
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const clickDatasetPart = (event) => {
    if (isDatasetPartIterator) {
      onClick({ tableId, columnGroupId, datasetId }, event);
    } else {
      onClick(datasetId, tableId, event);
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const datasetPartClasses = classNames(css.datasetPart, {
    [css.topLine]: topLine,
    [css.bottomLine]: bottomLine,
    [css.hasFocus]: hasFocus,
    [css.clickable]: isClickable,
  });

  const datasetPartStyle = {
    ...(backgroundColor && { background: backgroundColor.color }),
    ...((datasetPaddingRight !== DatasetPart.defaultProps.datasetPaddingRight) && { paddingRight: datasetPaddingRight.cssValue }),
    ...((datasetPaddingLeft !== DatasetPart.defaultProps.datasetPaddingLeft) && { paddingLeft: datasetPaddingLeft.cssValue }),
    transform: `translate(${posX}px, ${posY}px)`,
  };

  return (
    <div
      className={datasetPartClasses}
      style={datasetPartStyle}
      {...(isClickable && {
        onClick: clickDatasetPart,
      })}
    >
      {InnerDatasetPart({
        isRtl,
        tableId,
        columnGroupId,
        datasetId,
        cellsMetaData,
        gridTemplateRows,
        gridTemplateColumns,
        gridTemplateAreas,
        columnGap,
        endLine: modEndLine,
        cellIterator,
        isNewCellIterator: isDatasetPartIterator,
      })}
    </div>
  );
  //                                                                                  </editor-fold>
});

DatasetPart.displayName = 'DatasetPart';

DatasetPart.propTypes = {
  isRtl: PropTypes.bool,
  columnGroupId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  datasetId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  cellsMetaData: PropTypes.arrayOf(PropTypes.shape({
    cellId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    startRowIdx: PropTypes.number,
    endRowIdx: PropTypes.number,
    startColumnIdx: PropTypes.number,
    endColumnIdx: PropTypes.number,
    measureHeight: PropTypes.bool,
    measureWidth: PropTypes.bool,
  })),
  posX: PropTypes.number,
  posY: PropTypes.number,
  gridTemplateRows: PropTypes.string,
  gridTemplateColumns: PropTypes.string,
  gridTemplateAreas: PropTypes.string,
  topLine: PropTypes.bool,
  bottomLine: PropTypes.bool,
  endLine: PropTypes.bool,
};

DatasetPart.defaultProps = {
  isRtl: false,
  cellsMetaData: [],
  posX: 0,
  posY: 0,
  gridTemplateRows: '',
  gridTemplateColumns: '',
  gridTemplateAreas: '',
  topLine: false,
  bottomLine: false,
  endLine: false,
};

export default DatasetPart;
