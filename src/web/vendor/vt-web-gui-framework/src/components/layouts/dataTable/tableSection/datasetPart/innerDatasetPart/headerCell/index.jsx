import PropTypes from 'prop-types';
import { memo, useRef } from 'react';

import Enums from 'assets/enums';
import { useCellMeasurer } from 'components/helpers/tablePreparer';
import Icon from 'components/indicators/icon';
import classNames from 'utils/classNames';
import convertUnicode from 'utils/convertUnicode';

import { DataTableSortOrder } from '../../../../enums';
import css from './headerCell.scss';


/**
 * Memoized React component of a header cell, displayed in an partial dataset (components
 * DatasetPart and InnerDatasetPart) of a data table (component DataTable). Due to performance
 * reasons this component does not require the use of hook useStylingProps.
 */
const HeaderCell = memo(({
  tableId, columnGroupId, datasetId, gridArea, placeSelf, alignSelf, justifySelf, textAlign,
  cellMetaData, label, sortOrder, onClick, isNewCellIterator,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const elemRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isClickable = (typeof onClick === 'function');
  const isReverse = (justifySelf === Enums.PlaceSelfItems.END)
    || ((justifySelf === HeaderCell.defaultProps.justifySelf) && (placeSelf === Enums.PlaceSelfItems.END));


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useCellMeasurer(columnGroupId, datasetId, cellMetaData, elemRef);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const dataTableHeaderCellClasses = classNames(css.headerCell, {
    [css.reverse]: isReverse,
    [css.clickable]: isClickable,
  });

  const dataTableHeaderCellStyle = {
    gridArea,
    ...((placeSelf !== HeaderCell.defaultProps.placeSelf) && { placeSelf: placeSelf.cssValue }),
    ...((alignSelf !== HeaderCell.defaultProps.alignSelf) && { alignSelf: alignSelf.cssValue }),
    ...((justifySelf !== HeaderCell.defaultProps.justifySelf) && { justifySelf: justifySelf.cssValue }),
    ...((textAlign !== HeaderCell.defaultProps.textAlign) && { textAlign: textAlign.cssValue }),
  };

  return (
    <div
      ref={elemRef}
      className={dataTableHeaderCellClasses}
      style={dataTableHeaderCellStyle}
      {...(isClickable && {
        onClick: (event) => {
          // Deprecated: at next major version, only the new definition of onClick is used.
          //  The old one and prop isNewCellIterator has to be deleted.
          if (isNewCellIterator) {
            onClick({
              tableId, columnGroupId, datasetId, cellId: gridArea,
            }, event);
          } else {
            onClick(datasetId, gridArea, tableId, event);
          }
        },
      })}
    >
      <span className={css.label}>{convertUnicode(label)}</span>
      {(sortOrder === DataTableSortOrder.ASC) && (
        <Icon icon="ARROWUP" />
      )}
      {(sortOrder === DataTableSortOrder.DESC) && (
        <Icon icon="ARROWDOWN" />
      )}
    </div>
  );
  //                                                                                  </editor-fold>
});

HeaderCell.displayName = 'HeaderCell';

HeaderCell.propTypes = {
  tableId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  columnGroupId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  datasetId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  gridArea: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  placeSelf: PropTypes.instanceOf(Enums.PlaceSelfItems),
  alignSelf: PropTypes.instanceOf(Enums.PlaceSelfItems),
  justifySelf: PropTypes.instanceOf(Enums.PlaceSelfItems),
  textAlign: PropTypes.instanceOf(Enums.TextAlign),
  cellMetaData: PropTypes.shape({
    cellId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    startRowIdx: PropTypes.number,
    endRowIdx: PropTypes.number,
    startColumnIdx: PropTypes.number,
    endColumnIdx: PropTypes.number,
    measureHeight: PropTypes.bool,
    measureWidth: PropTypes.bool,
  }),
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  sortOrder: PropTypes.instanceOf(DataTableSortOrder),
  onClick: PropTypes.func,
  isNewCellIterator: PropTypes.bool,
};

HeaderCell.defaultProps = {
  tableId: '',
  gridArea: '',
  placeSelf: Enums.PlaceSelfItems.AUTO,
  alignSelf: Enums.PlaceSelfItems.AUTO,
  justifySelf: Enums.PlaceSelfItems.AUTO,
  textAlign: Enums.TextAlign.AUTO,
  cellMetaData: {
    startRowIdx: 0,
    endRowIdx: 0,
    startColumnIdx: 0,
    endColumnIdx: 0,
    measureHeight: false,
    measureWidth: false,
  },
  label: '',
  sortOrder: DataTableSortOrder.UNSORTED,
  onClick: null,
  isNewCellIterator: false,
};

export default HeaderCell;
