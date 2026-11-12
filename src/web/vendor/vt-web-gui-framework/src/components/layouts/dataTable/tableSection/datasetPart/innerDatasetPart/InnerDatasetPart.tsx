import { classNames } from 'utils/classNames';

import { ContainerCell } from './containerCell/ContainerCell';
import { DataCell } from './dataCell/DataCell';
import { HeaderCell } from './headerCell/HeaderCell';
import * as css from './innerDatasetPart.scss';
import type { InnerDatasetPartProps } from './innerDatasetPart.types';


/**
 * React component of the inner partial dataset. It calls the cell iterator function for
 * each cell of the dataset to render it.
 */
const InnerDatasetPart = ({
  tableId, columnGroupId, datasetId, cellsMetaData, isRtl, gridTemplateRows, gridTemplateColumns,
  gridTemplateAreas, columnGap, endLine, cellIterator,
}: InnerDatasetPartProps) => {
  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


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


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const innerDatasetPartClasses = classNames(css.innerDatasetPart, {
    [css.endLine]: endLine,
  });

  const innerDatasetPartStyle = {
    gridTemplateRows,
    gridTemplateColumns,
    gridTemplateAreas,
    columnGap,
    ...(endLine && { [isRtl ? 'paddingLeft' : 'paddingRight']: endLine }),
  };

  return (
    <div className={innerDatasetPartClasses} style={innerDatasetPartStyle}>
      {cellsMetaData.map((cellMetaData) => {
        const { cellId } = cellMetaData;
        const cellData = cellIterator({
          tableId, columnGroupId, datasetId, cellId,
        });
        const commonCellData = {
          tableId, columnGroupId, datasetId, cellId, cellMetaData,
        };

        if ((typeof cellData?.label === 'string') || (typeof cellData?.label === 'number')) {
          return (
            <HeaderCell {...cellData as ReturnType<typeof cellIterator> & { label: string | number }} key={cellId} {...commonCellData} />
          );
        }

        if ((typeof cellData?.content === 'string') || (typeof cellData?.content === 'number') || (cellData?.content === null)) {
          return (
            <DataCell {...cellData as ReturnType<typeof cellIterator> & { content: string | number | null }} key={cellId} {...commonCellData} />
          );
        }

        return (
          <ContainerCell {...cellData} key={cellId} {...commonCellData} />
        );
      })}
    </div>
  );
  //                                                                                  </editor-fold>
};

InnerDatasetPart.displayName = 'InnerDatasetPart';

export { InnerDatasetPart };
