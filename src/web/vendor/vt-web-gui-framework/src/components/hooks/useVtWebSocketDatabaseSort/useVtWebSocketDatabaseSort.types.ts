import type { VtWebSocketDatabaseSort, vtWebSocketDatabasesSlice } from 'store/vtWebSocket/vtWebSocketDatabases';


export interface UseVtWebSocketDatabaseSortResult {
  sorterIds: ReturnType<typeof vtWebSocketDatabasesSlice.selectAllSorterIds>;
  sorters: ReturnType<typeof vtWebSocketDatabasesSlice.selectAllSorters>;
  sort: ReturnType<typeof vtWebSocketDatabasesSlice.selectSort>;
  isSortModified: ReturnType<typeof vtWebSocketDatabasesSlice.selectIsSortModified>;
  setSort: (
    /** The entries of the sort in the order of their priority, the first one ranking highest. An
     * empty list leaves the order to the server. */
    sort: VtWebSocketDatabaseSort,
  ) => void;
  sortBy: (change: {
    /** The ID of the sorter. */
    id: string;
    /** The value of the sorter, e.g. "ASC" or "DESC". Anything that is no string resets the sort,
     * which leaves the order to the server. */
    value: string | number | null;
  }) => void;
  resetSort: () => void;
  applySort: () => void;
}
