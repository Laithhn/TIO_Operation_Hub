import type { vtWebSocketDatabasesSlice } from 'store/vtWebSocket/vtWebSocketDatabases';


/** What the functions of the React hook "useVtWebSocketDatabaseFilters" that set a value take: the
 * ID of the filter and its new value. */
export interface UseVtWebSocketDatabaseFiltersChange {
  /** The ID of the filter. */
  id: string;
  /** The new value of the filter. */
  value?: ReturnType<typeof vtWebSocketDatabasesSlice.selectFilterValue>;
  /** The new options of a multiple select ("mselect") filter. */
  values?: Parameters<typeof vtWebSocketDatabasesSlice.setMultiSelectFilter>[3];
}


/** What the functions of the React hook "useVtWebSocketDatabaseFilters" that set a value from a
 * date take: the ID of the filter and the date. */
export interface UseVtWebSocketDatabaseFiltersDateTimeChange {
  /** The ID of the filter. */
  id: string;
  /** The date and time, or null for none. */
  date: Date | null;
}


export interface UseVtWebSocketDatabaseFiltersResult {
  filters: ReturnType<typeof vtWebSocketDatabasesSlice.selectAllFilters>;
  values: ReturnType<typeof vtWebSocketDatabasesSlice.selectAllFilterValues>;
  areFiltersModified: ReturnType<typeof vtWebSocketDatabasesSlice.selectAreFiltersModified>;
  isFilterModified: (
    /** The ID of the filter. */
    filterId: string,
  ) => boolean;
  setValue: (change: UseVtWebSocketDatabaseFiltersChange) => void;
  setDateTimeValue: (change: UseVtWebSocketDatabaseFiltersDateTimeChange) => void;
  setDateTimeValueSec: (change: UseVtWebSocketDatabaseFiltersDateTimeChange) => void;
  setOperator: (change: {
    /** The ID of the filter. */
    id: string;
    /** The operator. Anything that is no string resets the operator to the default one of the
     * database layout. */
    value: string | number | null;
  }) => void;
  resetFilter: (change: {
    /** The ID of the filter. */
    id: string;
  }) => void;
  resetAllFilters: () => void;
  applyFilters: () => void;
}
