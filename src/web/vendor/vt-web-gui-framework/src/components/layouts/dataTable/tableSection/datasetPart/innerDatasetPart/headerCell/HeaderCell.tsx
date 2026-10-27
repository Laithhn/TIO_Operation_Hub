import { useRef } from 'react';

import { useCellMeasurer } from 'components/helpers/tablePreparer';
import { Icon } from 'components/indicators/icon';
import { classNames } from 'utils/classNames';
import { convertUnicode } from 'utils/convertUnicode';

import * as css from './headerCell.scss';
import type { HeaderCellProps } from './headerCell.types';


/**
 * React component of a header cell, displayed in an partial dataset (components DatasetPart and
 * InnerDatasetPart) of a data table (component DataTable). Due to performance reasons this
 * component does not require the use of hook useStylingProps.
 */
const HeaderCell = ({
  tableId, columnGroupId, datasetId, cellId, cellMetaData, placeSelf, alignSelf, justifySelf,
  textAlign, label, sortOrder, onClick,
}: HeaderCellProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const headerCellRef = useRef<HTMLDivElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isClickable = (typeof onClick === 'function');
  const isReverse = (
    (justifySelf === 'end')
    || ((justifySelf === undefined) && (placeSelf === 'end'))
  );


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for synthetic React mouse event "onClick" on the header cell element.
   */
  const handleClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    onClick?.({
      tableId, columnGroupId, datasetId, cellId, event,
    });
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useCellMeasurer({
    ref: headerCellRef,
    columnGroupId,
    datasetId,
    cellMetaData,
  });


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const headerCellClasses = classNames(css.headerCell, {
    [css.reverse]: isReverse,
    [css.clickable]: isClickable,
  });

  const headerCellStyle = {
    gridArea: cellId,
    placeSelf,
    alignSelf,
    justifySelf,
    textAlign,
  };

  return (
    <div
      ref={headerCellRef}
      className={headerCellClasses}
      style={headerCellStyle}
      {...(isClickable && { onClick: handleClick })}
    >
      <span className={css.label}>{convertUnicode(String(label))}</span>
      {(sortOrder === 'asc') && (
        <Icon icon="ARROWUP" />
      )}
      {(sortOrder === 'desc') && (
        <Icon icon="ARROWDOWN" />
      )}
    </div>
  );
  //                                                                                  </editor-fold>
};

HeaderCell.displayName = 'HeaderCell';


export { HeaderCell };
