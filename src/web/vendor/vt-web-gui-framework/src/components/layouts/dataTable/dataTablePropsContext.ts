import { createContext } from 'react';

import type { PropsForContext } from './dataTable.types';


/*
 * A React context of the data table provides and passes through to the
 */
const DataTablePropsContext = createContext<PropsForContext>({});


export { DataTablePropsContext };
