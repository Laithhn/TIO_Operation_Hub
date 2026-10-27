import { useContext, useRef, useLayoutEffect } from 'react';

import ContextCellMeasurer from '../contextCellMeasurer';


/**
 * React hook using a layout effect to measure a cell of a given ref to set its height and width.
 */
const useCellMeasurer = (columnGroupId, datasetId, {
  cellId, startRowIdx, endRowIdx, startColumnIdx, endColumnIdx, measureHeight, measureWidth,
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { setCellHeight, setCellWidth } = useContext(ContextCellMeasurer);
  const prevsRef = useRef({});


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

  // Effect to measure the height and / or the width of the cell. For performance reasons, functions
  // setCellHeight and setCellWidth are only called if significant values changed. columnGroupId,
  // datasetId and cellId can not change during the livetime of a cell.
  useLayoutEffect(() => {
    if (measureHeight) {
      const { height } = ref.current.getBoundingClientRect();

      if (
        (height !== prevsRef.current.height)
        || (startRowIdx !== prevsRef.current.startRowIdx)
        || (endRowIdx !== prevsRef.current.endRowIdx)
      ) {
        setCellHeight(columnGroupId, datasetId, cellId, startRowIdx, endRowIdx, height);

        prevsRef.current.height = height;
        prevsRef.current.startRowIdx = startRowIdx;
        prevsRef.current.endRowIdx = endRowIdx;
      }
    }

    if (measureWidth) {
      const { width } = ref.current.getBoundingClientRect();

      if (
        (width !== prevsRef.current.width)
        || (startColumnIdx !== prevsRef.current.startColumnIdx)
        || (endColumnIdx !== prevsRef.current.endColumnIdx)
      ) {
        setCellWidth(columnGroupId, datasetId, cellId, startColumnIdx, endColumnIdx, width);

        prevsRef.current.width = width;
        prevsRef.current.startColumnIdx = startColumnIdx;
        prevsRef.current.endColumnIdx = endColumnIdx;
      }
    }
  });


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  //                                                                                  </editor-fold>
};

export default useCellMeasurer;
