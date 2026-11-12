/** Data container of a group with the resulted dimensions of all measured single and multiple
 * divisions of the group. */
export interface GroupDivisionsDimensions {
  /** Object with the resulted dimensions of all measured single divisions of the group. */
  singleDivDims: {
    /** The dimension values of the single divisions of a group, stored by the indexes of the single
     * divisions. */
    byIdx: Record<number, number>;
    /** Array with the indexes of all single divisions of a group. */
    allIdxs: number[];
  };
  /** Object with the resulted dimensions of all measured multiple divisions of the group. */
  multiDivDims: {
    /** The dimension values of all multiple divisions of a group, stored by the IDs of the multiple
     * divisions. */
    byId: Record<string, number>;
    /** Array with the IDs of all multiple divisions of a group. */
    allIds: string[];
  };
}


export interface UseDimensionsReducerState {
  /** The dimensions and some meta data of the measured single cells, stored by the unique cell
   * IDs. */
  dimByUcid: Record<string, {
    /** The value of the dimension of the cell. */
    dim: number;
    /** The numeric index of a single division or the ID of a multiple division, the cell spans. */
    div: number | string;
    /** True, if the division(s), the cell spans, is a multiple division or false if it is a single
     * division. */
    isMultiDiv: boolean;
  }>;
  /** Some meta data like assignments stored by group IDs. These data are only used by the reducer,
   * not by the selectors, so they are stored seperatelly and not together with the division
   * dimensions (see next). */
  metaDataByGid: Record<string, {
    /** Array with the unique IDs of all cells, assigned to the group. */
    allUcids: string[];
    /** Object with the indexes / IDs of all used divisions of the group as keys, and arrays with
     * the unique IDs of all cells, assigned to this divisions of the group as values. */
    ucidsByDiv: Record<string | number, string[]>;
  }>;
  /** The resulted dimensions of the divisions, stored by group IDs. */
  divDimsByGid: Record<string, GroupDivisionsDimensions>;
}


export type UseDimensionsReducerActions
  = | { type: 'SET_CELL_DIMENSION'; payload: {
    gid: string; ucid: string; dim: number; div: number | string; isMultiDiv: boolean;
  }; };


/** The props of the React hook "useDimensions". */
export interface UseDimensionsProps {
  /** A function returning an array with the dimension information of all divisions of a group
   * (given as argument). The indexes of the array are the indexes of the divisions. If a division
   * is marked as hidden, the value has to be null. Otherwise the values have to be objects with the
   * fields "dim" and "measure". If "measure" is false or not set, "dim" is the fix dimension of the
   * division as number. If the division has to be measured, "dim" is the minimium dimension of it
   * and "measure" has to be true (means "auto"), "auto" or "min-content". */
  readonly getDefaultDimensions: (gid: string) => ({ dim: number; measure?: boolean | 'auto' | 'min-content' } | null)[];
  /** Optionally a function, returning the gap as number between all divisions of a group (given as
   * argument). */
  readonly getDivisionGap?: (gid: string) => number;
  /** Optionally a function, returning the additional dimension as number for a group (given as
   * argument). */
  readonly getAdditionalDimension?: (gid: string) => number;
  /** Optionally the start value for the default average of the total dimensions for all groups. */
  readonly defaultAverageTotalDimension?: number;
}


/** The returned value of the React hook "useDimensions". */
export interface UseDimensionsResult {
  getDimensions: (gid: string) => { dims: (number | null)[]; totalDim: number; joinedDims: string };
  getAverageTotalDimension: () => number;
  setCellDimension: (gid: string, ucid: string, startDivIdx: number, endDivIdx: number, dim: number) => void;
}
