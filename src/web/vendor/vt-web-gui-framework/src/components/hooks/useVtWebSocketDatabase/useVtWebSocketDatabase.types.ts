import type { vtWebSocketDatabasesSlice } from 'store/vtWebSocket/vtWebSocketDatabases';


export interface UseVtWebSocketDatabaseResult {
  isDbInit: boolean;
  isDbRunning: boolean;
  areDatasetsLoading: ReturnType<typeof vtWebSocketDatabasesSlice.selectAreDatasetsLoading>;
  numTotal: ReturnType<typeof vtWebSocketDatabasesSlice.selectNumDatasetsTotal>;
  numBefore: ReturnType<typeof vtWebSocketDatabasesSlice.selectNumDatasetsBefore>;
  numAfter: ReturnType<typeof vtWebSocketDatabasesSlice.selectNumDatasetsAfter>;
  datasetIds: ReturnType<typeof vtWebSocketDatabasesSlice.selectAllDatasetIds>;
  numDatasetsToRequest: number;
  requestDatasets: (request?: {
    /** The position from where to request: "initial" (= "top"), "top" (default), "bottom",
     * "middle", "before" (= "up"), "up", "after" (= "down") or "down". */
    pos?: 'initial' | 'top' | 'bottom' | 'middle' | 'up' | 'before' | 'down' | 'after';
    /** The number of datasets to request. If not given, the number the table reports (see field
     * "averageNumVisibleDatasets") is taken, and without that one the stored value from the last
     * call where a number was set (default: 1). */
    cnt?: number;
    /** The number of datasets that fit into the table, as component <DataTable> reports it. It
     * stands in for the field "cnt" where that one is not given. */
    averageNumVisibleDatasets?: number;
    /** If set to true, the given number of datasets is not stored internally. */
    doNotSaveCnt?: boolean;
    /** The ID of the dataset to jump to. It is mandatory at position "middle", optional at "top"
     * and "bottom", where it places its dataset first or last, and without effect elsewhere. */
    datasetId?: string;
  }) => void;
}
