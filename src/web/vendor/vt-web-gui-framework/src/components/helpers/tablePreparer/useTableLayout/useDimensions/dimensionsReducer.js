/**
 * The state of the dimensions reducer.
 * @typedef {object} StateDimensionsReducer
 * @property {Object.<string, StateCellsByUcid>} cellsByUcid - The dimensions and some data of the
 *   measured cells, stored by the unique cell IDs.
 * @property {Object.<string, StateMetaDataByGid>} metaDataByGid - Some meta data like assignments,
 *   stored by group IDs. These data are only used by the reducer, not by the selectors, so they are
 *   stored seperatelly and not together with the division dimensions (see next).
 * @property {Object.<string, StateDivDimsByGid>} divDimsByGid - The resulted dimensions of the
 *   divisions, stored by group IDs.
 */

/**
 * Exported function to create the initial state.
 *
 * @returns {StateDimensionsReducer}
 */
export const initialState = () => ({
  cellsByUcid: {},
  metaDataByGid: {},
  divDimsByGid: {},
});


/**
 * The dimension and assigned division of a measured cell.
 * @typedef {object} StateCellsByUcid
 * @property {number} dim - The value of the dimension of the cell.
 * @property {number|string} div - The numeric index of a single division or the ID of a multiple
 *   division, the cell is assigned to.
 * @property {boolean} isMultiDiv - True, if the division, the cell is assigned to, is a multiple
 *   division or false if it is a single division.
 */


/**
 * Meta data container of a group with two elements.
 * @typedef {object} StateMetaDataByGid
 * @property {string[]} allUcids - Array with the unique IDs of all cells, assigned to the group.
 * @property {Object.<string|number, string[]>} ucidsByDiv - Object with the indexes and IDs of all
 *   used divisions of the group as keys, and arrays with the unique IDs of all cells, assigned to
 *   this divisions of the group as values.
 */


/**
 * Function to create the initial partial state of metaDataByGid.
 *
 * @returns {StateMetaDataByGid}
 */
const initialMetaDataByGid = () => ({
  allUcids: [],
  ucidsByDiv: {},
});


/**
 * Data container of a group with the resulted dimensions of all measured single and multiple
 * divisions of the group.
 * @typedef {object} StateDivDimsByGid
 * @property {StateSingleDivDims} singleDivDims - Object with the resulted dimensions of all
 *   measured single divisions of the group.
 * @property {StateMultiDivDims} multiDivDims - Object with the resulted dimensiona of all measured
 *   multiple divisions of the group.
 */

/**
 * @typedef {object} StateSingleDivDims
 * @property {Object.<number, number>} byIdx - The dimension values of the single divisions of a
 *   group, stored by the indexes of the single divisions.
 * @property {number[]} allIdxs - Array with the indexes of all single divisions of a group.
 */

/**
 * @typedef {object} StateMultiDivDims
 * @property {Object.<string, number>} byId - The dimension values of all multiple divisions of a
 *   group, stored by the IDs of the multiple divisions.
 * @property {string[]} allIds - Array with the IDs of all multiple divisions of a group.
 */

/**
 * Function to create the initial partial state of divDimsByGid.
 *
 * @returns {StateDivDimsByGid}
 */
const initialDivDimsByGid = () => ({
  singleDivDims: {
    byIdx: {},
    allIdxs: [],
  },
  multiDivDims: {
    byId: {},
    allIds: [],
  },
});


/**
 * The dimensions reducer, exported as default below. It stores the values of measured cells and can
 * deliver the maximum dimensions of the devisions, the cells are assigned to. It is distinguished
 * between single and multiple divisions. Multiple divisions span over several single divisions. The
 * state of this reducer is specially designed to consider only necessary state changes: not every
 * change of a cell leads to changes of the dimensions of the divisions.
 */
const dimensionsReducer = (state, { type, payload }) => {
  switch (type) {
    // ---------------------------------------------------------------------------------------------
    case 'SET_CELL_DIMENSION': {
    // ---------------------------------------------------------------------------------------------

      const {
        gid, ucid, dim, div, isMultiDiv,
      } = payload;

      const prevDim = state.cellsByUcid[ucid]?.dim;
      const prevDiv = state.cellsByUcid[ucid]?.div;

      if ((dim === prevDim) && (div === prevDiv)) {
        return state;
      }

      const isNewCell = !state.cellsByUcid[ucid];
      const hasDivChanged = !isNewCell && (div !== prevDiv);
      let areMetaDataChanged = false,
        { allUcids, ucidsByDiv } = state.metaDataByGid[gid] ?? initialMetaDataByGid(),
        areDivDimsChanged = false,
        { singleDivDims: { byIdx, allIdxs }, multiDivDims: { byId, allIds } } = state.divDimsByGid[gid] ?? initialDivDimsByGid();

      // Sub-state cellsByUcid with cell data stored by the unique cell ID (independent of the
      // group). Is always created new.
      const cellsByUcid = {
        ...state.cellsByUcid,
        [ucid]: {
          dim,
          div,
          isMultiDiv,
        },
      };


      // Sub-state allUcids with all unique cell IDs assigned to the given group. Is only created
      // new, if the cell is new.
      if (isNewCell) {
        areMetaDataChanged = true;
        allUcids = [...allUcids, ucid];
      }


      // Sub-state ucidsByDiv with all the unique cell IDs assigned to the divisions of the groups.
      // Is only created new, if the cell is new or if the division has changed.
      if (isNewCell || hasDivChanged) {
        areMetaDataChanged = true;
        ucidsByDiv = {
          ...ucidsByDiv,
          ...(hasDivChanged && {
            [prevDiv]: ucidsByDiv[prevDiv].filter((u) => (u !== ucid)),
          }),
          [div]: [...(ucidsByDiv[div] ?? []), ucid],
        };
      }


      // If the cell is NOT new but the division has changed, remove its previous dimension from the
      // previous divison.
      if (hasDivChanged) {
        const wasMultiDiv = state.cellsByUcid[ucid]?.isMultiDiv;

        if (ucidsByDiv[prevDiv].length === 0) {
          // a) if there is no other cell assigned to the previous division, remove the complete
          // multiple or single division.
          areDivDimsChanged = true;

          if (wasMultiDiv) {
            allIds = allIds.filter((d) => (d !== prevDiv));
            byId = allIds.reduce((acc, d) => ({
              ...acc,
              [d]: byId[d],
            }), {});
          } else {
            allIdxs = allIdxs.filter((d) => (d !== prevDiv));
            byIdx = allIdxs.reduce((acc, d) => ({
              ...acc,
              [d]: byIdx[d],
            }), {});
          }
        } else if (prevDim === (wasMultiDiv ? byId[prevDiv] : byIdx[prevDiv])) {
          // b) if there are any other cells assigned to the previous division and if the previous
          // dimension of the cell is equal to the resulting dimension of the previous division,
          // recalculate it
          const nextDivDim = ucidsByDiv[prevDiv].reduce((acc, u) => (
            Math.max(acc, cellsByUcid[u].dim)
          ), 0);

          if (nextDivDim !== (wasMultiDiv ? byId[prevDiv] : byIdx[prevDiv])) {
            areDivDimsChanged = true;

            if (wasMultiDiv) {
              byId = { ...byId, [prevDiv]: nextDivDim };
            } else {
              byIdx = { ...byIdx, [prevDiv]: nextDivDim };
            }
          }
        }
      }


      const prevDivDim = isMultiDiv ? byId[div] : byIdx[div];
      const isNewDiv = (prevDivDim === undefined);

      // Sub-state multiDivDims or singleDivDims with the resulting dimensions of the multiple or
      // single division.
      if (isNewDiv || (dim > prevDivDim)) {
        // a) if the division was not set before or if the dimension of the cell is larger than its
        // resulting dimension
        areDivDimsChanged = true;

        if (isMultiDiv) {
          byId = { ...byId, [div]: dim };
        } else {
          byIdx = { ...byIdx, [div]: dim };
        }

        if (isNewDiv) {
          if (isMultiDiv) {
            allIds = [...allIds, div];
          } else {
            allIdxs = [...allIdxs, div];
          }
        }
      } else if (!hasDivChanged && (dim < prevDivDim) && (prevDim === prevDivDim)) {
        // b) if the dimension of the (not new) cell is smaller than the resulting dimension, but if
        // it's previous dimension is equal to the resulting dimension (without division change),
        // recalculate it
        const nextDivDim = ucidsByDiv[div].reduce((acc, u) => (
          Math.max(acc, cellsByUcid[u].dim)
        ), 0);

        if (nextDivDim !== prevDivDim) {
          areDivDimsChanged = true;

          if (isMultiDiv) {
            byId = { ...byId, [div]: nextDivDim };
          } else {
            byIdx = { ...byIdx, [div]: nextDivDim };
          }
        }
      }

      return {
        ...state,
        cellsByUcid, // always new
        ...(areMetaDataChanged && {
          metaDataByGid: {
            ...state.metaDataByGid,
            [gid]: {
              allUcids,
              ucidsByDiv,
            },
          },
        }),
        ...(areDivDimsChanged && {
          divDimsByGid: {
            ...state.divDimsByGid,
            [gid]: {
              singleDivDims: {
                byIdx,
                allIdxs,
              },
              multiDivDims: {
                byId,
                allIds,
              },
            },
          },
        }),
      };
    }

    default:
      return state;
  }
};

export default dimensionsReducer;


export const actions = {
  /**
   * Exported action creator to set the measured dimension of a cell belonging to a group, selected
   * by a given group ID and unique cell ID.
   *
   * @param {string|number} gid - The group ID.
   * @param {string} ucid - The unique ID of a cell (is unique over all groups).
   * @param {number} startDivIdx - The index of the first division this cell spans.
   * @param {number} endDivIdx - The index of the last division this cell spans.
   * @param {number} dim - The measured dimension of the cell spans across the divisions.
   */
  setCellDimension: (gid, ucid, startDivIdx, endDivIdx, dim) => {
    let div, isMultiDiv;

    if (startDivIdx === endDivIdx) {
      div = startDivIdx;
      isMultiDiv = false;
    } else {
      div = `${Math.min(startDivIdx, endDivIdx)}-${Math.max(startDivIdx, endDivIdx)}`;
      isMultiDiv = true;
    }

    return {
      type: 'SET_CELL_DIMENSION',
      payload: {
        gid,
        ucid,
        dim: Math.ceil(dim),
        div,
        isMultiDiv,
      },
    };
  },
};


export const selectors = {
  /**
   * Exported selector to return a memoized object with the resulted dimension data of all single
   * and multiple divisions of all groups.
   *
   * @param {StateDimensionsReducer} state - The actual state.
   * @returns {StateDivDimsByGid}
   */
  getAllDivisionDimensions: (state) => state.divDimsByGid,
};
