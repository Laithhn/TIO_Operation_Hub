import { createContext } from 'react';

import type { CellMeasurerData } from './tablePreparer.types';


/*
 * A React context the table preparer provides and passes through to the cell elements that use the
 * hook useCellMeasurer. The context includes two functions setCellHeight and setCellWidth to set
 * the height and width of the cell.
 */
const CellMeasurerContext = createContext<CellMeasurerData>({});


export { CellMeasurerContext };
