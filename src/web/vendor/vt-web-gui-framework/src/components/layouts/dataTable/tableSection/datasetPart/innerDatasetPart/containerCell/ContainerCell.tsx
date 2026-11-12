import { useRef } from 'react';

import { useCellMeasurer } from 'components/helpers/tablePreparer';

import * as css from './containerCell.scss';
import type { ContainerCellProps } from './containerCell.types';


/**
 * React component of a dataset cell, displayed in an partial dataset (components DatasetPart and
 * InnerDatasetPart) of a data table (component DataTable).
 */
const ContainerCell = ({
  columnGroupId, datasetId, cellId, cellMetaData, placeSelf, alignSelf, justifySelf, content,
}: ContainerCellProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const containerCellRef = useRef<HTMLDivElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


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

  useCellMeasurer({
    ref: containerCellRef,
    columnGroupId,
    datasetId,
    cellMetaData,
  });


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const containerCellStyle = {
    gridArea: cellId,
    placeSelf,
    alignSelf,
    justifySelf,
  };

  return (
    <div ref={containerCellRef} className={css.containerCell} style={containerCellStyle}>
      {content}
    </div>
  );
  //                                                                                  </editor-fold>
};

ContainerCell.displayName = 'ContainerCell';


export { ContainerCell };
