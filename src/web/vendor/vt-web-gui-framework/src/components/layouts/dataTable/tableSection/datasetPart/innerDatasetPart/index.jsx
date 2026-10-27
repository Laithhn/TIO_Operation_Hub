import PropTypes from 'prop-types';

import Enums from 'assets/enums';
import classNames from 'utils/classNames';

import { DataTableCellType } from '../../../enums';
import DataCell from './dataCell';
import HeaderCell from './headerCell';
import css from './innerDatasetPart.scss';


/**
 * Stateless React component of the inner partial dataset. It calls the cell iterator function for
 * each cell of the dataset to render it.
 * Note, that if you call this component as a function, the default props are not considered!
 */
const InnerDatasetPart = ({
  isRtl, tableId, columnGroupId, datasetId, cellsMetaData, gridTemplateRows, gridTemplateColumns,
  gridTemplateAreas, columnGap, endLine, cellIterator, isNewCellIterator,
}) => {
  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let isEndLine = false,
    endLinePaddingPx;

  if (endLine === true) {
    isEndLine = true;
    endLinePaddingPx = '0px';
  } else if ((typeof endLine === 'number') && (endLine >= 0)) {
    isEndLine = true;
    endLinePaddingPx = `${endLine}px`;
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const innerDatasetPartClasses = classNames(css.innerDatasetPart, {
    [css.endLine]: isEndLine,
  });

  const innerDatasetPartStyle = {
    gridTemplateRows,
    gridTemplateColumns,
    gridTemplateAreas,
    columnGap: columnGap.cssValue,
    ...(isEndLine && { [isRtl ? 'paddingLeft' : 'paddingRight']: endLinePaddingPx }),
  };

  return (
    <div className={innerDatasetPartClasses} style={innerDatasetPartStyle}>
      {cellsMetaData.map((cellMetaData) => {
        const { cellId } = cellMetaData;
        // Deprecated: at next major version, only the new definition of the cellIterator is used.
        //  The old one and prop isNewCellIterator has to be deleted.
        const cellData = isNewCellIterator
          ? cellIterator({
            tableId, columnGroupId, datasetId, cellId,
          })
          : cellIterator(datasetId, cellId, tableId);

        const Cell = (cellData?.type === DataTableCellType.HEADER)
          ? HeaderCell
          : DataCell;

        return (
          <Cell
            {...cellData}
            key={cellId}
            gridArea={cellId}
            tableId={tableId}
            columnGroupId={columnGroupId}
            datasetId={datasetId}
            cellMetaData={cellMetaData}
            isNewCellIterator={isNewCellIterator}
          />
        );
      })}
    </div>
  );
  //                                                                                  </editor-fold>
};

InnerDatasetPart.displayName = 'InnerDatasetPart';

InnerDatasetPart.propTypes = {
  isRtl: PropTypes.bool,
  tableId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
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
  gridTemplateRows: PropTypes.string,
  gridTemplateColumns: PropTypes.string,
  gridTemplateAreas: PropTypes.string,
  columnGap: PropTypes.instanceOf(Enums.GapAndPadding),
  endLine: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
  cellIterator: PropTypes.func,
  isNewCellIterator: PropTypes.bool,
};

InnerDatasetPart.defaultProps = {
  isRtl: false,
  tableId: '',
  cellsMetaData: [],
  gridTemplateRows: '',
  gridTemplateColumns: '',
  gridTemplateAreas: '',
  columnGap: Enums.GapAndPadding.NONE,
  endLine: false,
  cellIterator() {},
  isNewCellIterator: false,
};

export default InnerDatasetPart;
