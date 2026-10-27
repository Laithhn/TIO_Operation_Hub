import { type WebSocketId } from 'interfaces/webSocketItf';
import type { LogEntry } from 'store/store.types';


export type VtWebSocketDatabaseFieldType = 'text' | 'int' | 'date' | 'img' | 'imgUri';

export type VtWebSocketDatabaseFilterType = 'text' | 'int' | 'date' | 'select' | 'mselect';

export type VtWebSocketData = string | number | boolean;
export type VtWebSocketDataset = VtWebSocketData[];


export interface VtWebSocketFilterCmd {
  id: string;
  reset?: true;
  value?: string | number | null;
  values?: (string | number)[];
  op?: string;
}


/** One entry of the sort of a database, as the sort command sends it. */
export interface VtWebSocketDatabaseSortEntry {
  /** The ID of a sorter of the database layout. */
  id: string;
  /** One of the values of that sorter, e.g. "ASC" or "DESC". */
  value: string;
}

/** The sort of a database: its entries in the order of their priority, the first one ranking
 * highest. An empty sort leaves the order to the server. */
export type VtWebSocketDatabaseSort = VtWebSocketDatabaseSortEntry[];


// The filter value of text filters is always a string. At numeric filters - "int" and "date" -
// without operators, it is either a number or null if the value is not set. At numeric filters with
// operators, the value is an array with two elements: the value as number or null if not set and
// the operator as string. At select filters, the value is either a string, a number or null if
// there is no selection. At multiple select ("mselect") filters, the filter value is always an
// object with key-value pairs where the key is the name of the option and the boolean value
// indicates if the opion is set or not.
export type VtWebSocketDatabaseFilterTextValue = string;
export type VtWebSocketDatabaseFilterNumericValuePlain = number | null;
export type VtWebSocketDatabaseFilterNumericValueWithOperator = [VtWebSocketDatabaseFilterNumericValuePlain, string];
export type VtWebSocketDatabaseFilterNumericValue = VtWebSocketDatabaseFilterNumericValuePlain | VtWebSocketDatabaseFilterNumericValueWithOperator;
export type VtWebSocketDatabaseFilterSelectValue = string | number | null;
export type VtWebSocketDatabaseFilterMultiSelectValue = Record<string, boolean>;
export type VtWebSocketDatabaseFilterValue = VtWebSocketDatabaseFilterTextValue | VtWebSocketDatabaseFilterNumericValue | VtWebSocketDatabaseFilterSelectValue | VtWebSocketDatabaseFilterMultiSelectValue;


export interface VtWebSocketDatabaseFieldLayout {
  /** The ID of the database field. */
  id: string;
  /** The zero based index of the database field that is used to identify a value in a dataset
   * array. */
  idx: number;
  /** True, if this database field is the key field. Occures only one time in all fields. */
  isKey: boolean;
  /** True, if the value of this database field may be changed. The specification lists the key
   * "editable" without marking it as optional, but a field that omits it counts as editable. */
  isEditable: boolean;
  /** True, if this database field should be shown. A field that omits the key "visible" counts as
   * visible. The framework carries the flag and acts on it nowhere: what a GUI makes of it is the
   * consumer's decision. */
  isVisible: boolean;
  /** The type of the database field. */
  type: VtWebSocketDatabaseFieldType;
}


export interface VtWebSocketDatabaseFilterLayout {
  /** The ID of the database filter. */
  id: string;
  /** The type of the database filter. A "date" filter is a numeric filter like "int", set by
   * setNumericFilter and sent the same way: its own type only tells a GUI to show a date picker. */
  type: VtWebSocketDatabaseFilterType;
  /** Only at text filters: is true, if the text filter can use wildcard pattern "*" or "?". */
  usePattern?: boolean;
  /** Only at select and multiple select ("mselect") filters: contains a list with all available
   * options that can be set. */
  options?: (string | number)[];
  /** Only at numeric filters - "int" and "date": contains the mathematical operators that can be
   * chosen for the value. The first one is the default operator. A single operator is valid: there
   * is nothing to choose then, and the value is always sent with that operator. */
  operators?: string[];
  /** The default value, set at initialization: The filter value of text filters is always a
   * string. At numeric filters - "int" and "date" - without operators it is either a number or null
   * if the value is not set. At numeric filters with operators, the value is an array with two
   * elements: the value as number or null if not set and the operator as string. At select filters,
   * the value is either a string, a number or null if there is no selection. At multiple select
   * ("mselect") filters, the value is always an object with key-value pairs where the key is the
   * name of the option and the boolean value indicates if the opion is set or not. */
  defaultValue: VtWebSocketDatabaseFilterValue;
}


export interface VtWebSocketDatabaseSorterLayout {
  /** The ID of the sorter, by which a sort addresses it. It is no field ID: what a sorter sorts by
   * is agreed between a source and the project using it, and the framework assumes nothing. */
  id: string;
  /** The values the sorter can be set to, e.g. "ASC" and "DESC", or other options of the source. */
  values: string[];
}


export interface VtWebSocketDatabaseLayout {
  fields: {
    /** The zero based index of the key field in the array of the database fields. */
    keyIdx: number;
    /** The number of fields, that is also the lengths of array allIds. */
    numFields: number;
    /** Object with the data objects of all fields of the database layout. The key is the ID of the
     * field. */
    byId: Record<string, VtWebSocketDatabaseFieldLayout>;
    /** The IDs of all database fields of the database layout. */
    allIds: string[];
  };
  filters: {
    /** Object with the data objects of all filters of the database layout. The key is the ID of the
     * filter. */
    byId: Record<string, VtWebSocketDatabaseFilterLayout>;
    /** The IDs of all database filters of the database layout. */
    allIds: string[];
  };
  sorters: {
    /** Object with the data objects of all sorters of the database layout. The key is the ID of
     * the sorter. */
    byId: Record<string, VtWebSocketDatabaseSorterLayout>;
    /** The IDs of all sorters of the database layout, in the order the layout lists them. It is
     * empty if the source offers no sorting. */
    allIds: string[];
  };
}


export interface VtWebSocketDatabaseFilter {
  /** The filter value that was last sent (applied) to the VtWebSocket database. The initial value
   * is the default value. */
  appliedValue: VtWebSocketDatabaseFilterValue;
  /** The current filter value. The initial value is the default value.*/
  value: VtWebSocketDatabaseFilterValue;
  /** True, if the value is equal to the default value (deep compare). The initial value is true. */
  isDefault: boolean;
  /** True, if the value was changed since last sending an update to the VtWebSocket database (deep
   * compare with appliedValue). The initial value is false. */
  hasChanged: boolean;
}


export interface VtWebSocketDatabase {
  /** The name of the database layout, this database is associated to. */
  layout: string;
  /** True, if data are currently being requested with "top", "bottom" or "middle". */
  isLoading: boolean;
  /** True, if the data cache is valid or false if not. A data cache becomes valid, when data are
   * successfully reqested and received. */
  isValid: boolean;
  /** The total number of (filtered) datasets in the VtWebSocket database. */
  numTotal: number | null;
  /** The number of the remaining datasets in the VtWebSocket database before (usually
   * chronologically before) those here in the Redux store. */
  numBefore: number | null;
  /** The number of the remaining datasets in the VtWebSocket database after (usually
   * chronologically after) those here in the Redux store. */
  numAfter: number | null;
  datasets: {
    /** Object with the data values as arrays of the datasets received from the VtWebSocket
     * database. The key is the ID of the dataset. */
    byId: Record<string, VtWebSocketDataset>;
    /** The IDs of the datasets received from the VtWebSocket database. */
    allIds: string[];
    /** The ID of the currently active dataset. If there are datasets, then there is always one of
     * them active. */
    activeId: string | null;
    /** The ID of the dataset that was requested with position "middle". It becomes the active one
     * as soon as it arrives, and the field is emptied again with that answer - also when the
     * dataset is not part of it. It is null while no such request is pending. */
    requestedActiveId: string | null;
    /** The IDs of the currently selected datasets. Can be empty */
    selectedIds: string[];
  };
  singleDatasets: {
    /** Object with the data values as arrays of single requested datasets received from the
     * VtWebSocket database. The key is the ID of the dataset. */
    byId: Record<string, VtWebSocketDataset>;
    /** The IDs of the single requested datasets received from the VtWebSocket database. */
    allIds: string[];
  };
  usedFilters: {
    /** Object with the data objects of all filters of the VtWebSocket databases that have
     * already been used. The key is the ID of the filter. */
    byId: Record<string, VtWebSocketDatabaseFilter>;
    /** The IDs of all filters of the VtWebSocket databases that have already been used. */
    allIds: string[];
  };
  sort: {
    /** The sort that was last sent (applied) to the VtWebSocket database. The initial value is an
     * empty sort, which leaves the order to the server. */
    appliedValue: VtWebSocketDatabaseSort;
    /** The current sort. The initial value is an empty sort. */
    value: VtWebSocketDatabaseSort;
    /** True, if the sort was changed since it was last sent to the VtWebSocket database (deep
     * compare with appliedValue). The initial value is false. */
    hasChanged: boolean;
  };
}


export interface VtWebSocketDatabasesState {
  /** Object with the data objects of all WebSocket connections to VtWebSocket servers. The key is
   * the ID of the WebSocket connection. */
  byId: Record<WebSocketId, {
    layouts: {
      /** Object with the data objects of the database layouts. The key is the name of the layout,
       * that is the name of the database source the layout belongs to and the string "layout",
       * seperated by a dot, e.g.: "vehicledata.layout". It is null, if the layout is currently being
       * requested. */
      byName: Record<string, VtWebSocketDatabaseLayout | null>;
      /** The names of all database layouts. */
      allNames: string[];
    };
    databases: {
      /** Object with the data objects of the databases. The key is the name of the database
       * source. */
      byName: Record<string, VtWebSocketDatabase>;
      /** The IDs of all databases. */
      allNames: string[];
    };
    /** An array of log entries occured in this slice. */
    logs: LogEntry[];
  }>;
}
