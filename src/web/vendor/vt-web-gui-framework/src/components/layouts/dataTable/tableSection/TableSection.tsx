import { useI18n } from 'components/hooks/useI18n';
import { classNames } from 'utils/classNames';

import { DatasetPart } from './datasetPart/DatasetPart';
import * as css from './tableSection.scss';
import type { TableSectionProps } from './tableSection.types';


/**
 * React container component for a section of a data table (component DataTable), containing partial
 * datasets, grouped as array and given as children.
 */
const TableSection = ({
  left = 0, right = 0, top = 0, bottom = 0, translateX = 0, translateY = 0, smoothScrolling = false,
  children,
}: TableSectionProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = useI18n();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // add. offset to ensure, that the datasets before, above and below are not overlaid
  const leftPx = (left > 0) ? `${left + 0.5}px` : 0;
  const rightPx = (right > 0) ? `${right}px` : 0;
  const topPx = (top > 0) ? `${top + 0.5}px` : 0;
  const bottomPx = (bottom > 0) ? `${bottom + 0.5}px` : 0;


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

  if (children.length === 0) {
    return null;
  }


  const scrollContrStyle = {
    inset: isRtl
      ? `${topPx} ${leftPx} ${bottomPx} ${rightPx}`
      : `${topPx} ${rightPx} ${bottomPx} ${leftPx}`,
  };

  const innerContrClasses = classNames(css.innerContr, {
    [css.smoothScrolling]: smoothScrolling,
  });

  const innerContrStyle = {
    transform: `translate(${isRtl ? -translateX : translateX}px, ${translateY}px)`,
  };

  return (
    <div className={css.scrollContr} style={scrollContrStyle}>
      <div className={innerContrClasses} style={innerContrStyle}>
        {children.map(({
          columnGroupId, datasetId, posX, posY, gridTemplateRows, gridTemplateColumns,
          gridTemplateAreas, topLine, bottomLine, endLine, cellsMetaData,
        }) => (
          <DatasetPart
            key={`${columnGroupId}-${datasetId}`}
            columnGroupId={columnGroupId}
            datasetId={datasetId}
            posX={posX}
            posY={posY}
            isRtl={isRtl}
            gridTemplateRows={gridTemplateRows}
            gridTemplateColumns={gridTemplateColumns}
            gridTemplateAreas={gridTemplateAreas}
            topLine={!!topLine}
            bottomLine={!!bottomLine}
            endLine={endLine}
            cellsMetaData={cellsMetaData}
          />
        ))}
      </div>
    </div>
  );
  //                                                                                  </editor-fold>
};

TableSection.displayName = 'TableSection';


export { TableSection };
