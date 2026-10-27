import { useRef } from 'react';

import { color, getGround, getTypoColorClass } from 'assets/styles';
import { useCellMeasurer } from 'components/helpers/tablePreparer';
import { classNames } from 'utils/classNames';

import * as css from './dataCell.scss';
import type { DataCellProps } from './dataCell.types';


/**
 * React component of a dataset cell, displayed in an partial dataset (components DatasetPart and
 * InnerDatasetPart) of a data table (component DataTable). Due to performance reasons this
 * component does not require the use of hook useStylingProps.
 */
const DataCell = ({
  tableId, columnGroupId, datasetId, cellId, cellMetaData, placeSelf, alignSelf, justifySelf,
  textAlign, backgroundColor, valueSize, valueColor, disabled, content, onClick,
}: DataCellProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const innerContrRef = useRef<HTMLDivElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const hasBackground = !!backgroundColor;
  // a cell with a colour of its own is the ground of its content
  const ground = hasBackground && getGround(backgroundColor);
  const isClickable = (typeof onClick === 'function');


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
    ref: innerContrRef,
    columnGroupId,
    datasetId,
    cellMetaData,
  });


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  // The value's colour takes the form for the ground the cell sits on through its class.
  const innerContrClasses = classNames(css.innerContrSimple, valueColor ? getTypoColorClass(css, valueColor) : '', {
    [css.typoValueSmall]: (valueSize === 'small'),
    [css.typoValueLarge]: (valueSize === 'large'),
    [css.typoDisabled]: disabled,
  });

  const innerContrStyle = {
    ...(!hasBackground && !isClickable && { gridArea: cellId }),
    ...(placeSelf && { placeSelf }),
    ...(alignSelf && { alignSelf }),
    ...(justifySelf && { justifySelf }),
    ...(textAlign && { textAlign }),
  };

  const innerContr = (
    <div ref={innerContrRef} className={innerContrClasses} style={innerContrStyle}>
      {content}
    </div>
  );


  if (hasBackground || isClickable) {
    const outerContrClasses = classNames(css.outerContr, {
      [css.clickable]: isClickable,
    });

    return (
      <div
        className={outerContrClasses}
        style={{
          gridArea: cellId,
          ...(hasBackground && { background: color[backgroundColor] }),
          ...(ground && { '--ground': ground }),
        }}
        {...(isClickable && { onClick: handleClick })}
      >
        {innerContr}
      </div>
    );
  }

  return innerContr;
  //                                                                                  </editor-fold>
};

DataCell.displayName = 'DataCell';


export { DataCell };
