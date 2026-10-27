import PropTypes from 'prop-types';

import { hooks } from 'store';
import classNames from 'utils/classNames';

import DatasetPart from './datasetPart';
import css from './tableSection.scss';


/**
 * React container component for a section of a data table (component DataTable), containing partial
 * datasets, grouped as array and given as children.
 */
const TableSection = ({
  left, right, top, bottom, translateX, translateY, smoothScrolling, children,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = hooks.useI18n();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // add. offset to ensure, that the datasets before, above and below are not overlaid
  const leftPx = (left > 0) ? `${left + 0.5}px` : 0;
//  const rightPx = (right > 0) ? `${right + 0.5}px` : 0;
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
          columnGroupId, datasetId, cellsMetaData, posX, posY, gridTemplateRows,
          gridTemplateColumns, gridTemplateAreas, topLine, bottomLine, endLine,
        }) => (
          <DatasetPart
            key={`${columnGroupId}-${datasetId}`}
            isRtl={isRtl}
            columnGroupId={columnGroupId}
            datasetId={datasetId}
            cellsMetaData={cellsMetaData}
            posX={posX}
            posY={posY}
            gridTemplateRows={gridTemplateRows}
            gridTemplateColumns={gridTemplateColumns}
            gridTemplateAreas={gridTemplateAreas}
            topLine={topLine}
            bottomLine={bottomLine}
            endLine={endLine}
          />
        ))}
      </div>
    </div>
  );
  //                                                                                  </editor-fold>
};

TableSection.displayName = 'TableSection';

TableSection.propTypes = {
  left: PropTypes.number,
  right: PropTypes.number,
  top: PropTypes.number,
  bottom: PropTypes.number,
  translateX: PropTypes.number,
  translateY: PropTypes.number,
  smoothScrolling: PropTypes.bool,
  children: PropTypes.arrayOf(PropTypes.shape({
    columnGroupId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    datasetId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
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
    bottomLine: PropTypes.bool,
  })),
};

TableSection.defaultProps = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  translateX: 0,
  translateY: 0,
  smoothScrolling: false,
  children: [],
};

export default TableSection;
