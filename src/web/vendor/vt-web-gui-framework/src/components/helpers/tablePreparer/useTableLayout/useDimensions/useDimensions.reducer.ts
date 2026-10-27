import type { UseDimensionsReducerActions, UseDimensionsReducerState } from './useDimensions.types';


export const initialState: UseDimensionsReducerState = {
  dimByUcid: {},
  metaDataByGid: {},
  divDimsByGid: {},
};


// The scheme of groups, divisions and cells (example):
//
// Groups:     | groupA                        || groupB                 |
// Divisions:  | 0      | 1    | 2   | 3 | 4   || 0      | 1  | 2    | 3 |
//             |--------|------------|---|-----||--------|----|----------|
// Cells:      | a      | b          | c | d   || e           | f        |
//             | g      | h    | i       | j   || k      | l  | m        |
//
// Cell "c" for example belongs to group "groupA" and only spans its 4th divison (division index of
// the cell is 3), cell "m" belongs to group "groupB" and spans its 3rd and 4th division (division
// id of the cell is "2-3").
//
// For example for group "groupA", there will be a resulted dimension for the single divisions 0
// (cell "a" and "g"), 1 (cell "h"), 3 (cell "c") and 4 (cell "d" and "j") and for the multiple
// divisions "1-2" (cell "b") and "2-3" (cell "i").


/**
 * The reducer of the hook useDimensions to store and manage cells. A cell belongs to a group of
 * cells. The cell cannot switch the group. A group is divided into single divisions. A cell can
 * span one or multiple divisions. The cells can change the division of the group. In this reducer
 * the resulting dimensions of all cells are calculated and stored, that spans the same single or
 * multiple division. The dimension of a single or multiple division is (re-)calculated, if new
 * cells were added to a group, if the dimension of a cell changed or if a cell switches the
 * division.
 */
export const reducer = (state: UseDimensionsReducerState, { type, payload }: UseDimensionsReducerActions) => {
  switch (type) {
    // ---------------------------------------------------------------------------------------------
    case 'SET_CELL_DIMENSION': { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
    // ---------------------------------------------------------------------------------------------

      const {
        gid, ucid, dim, div, isMultiDiv,
      } = payload;

      const prevDim = state.dimByUcid[ucid]?.dim;
      const prevDiv = state.dimByUcid[ucid]?.div;

      if ((dim === prevDim) && (div === prevDiv)) {
        return state;
      }

      const isNewCell = !state.dimByUcid[ucid];
      const hasDivChanged = !isNewCell && (div !== prevDiv);
      let areMetaDataChanged = false,
        { allUcids, ucidsByDiv } = state.metaDataByGid[gid] ?? {
          allUcids: [],
          ucidsByDiv: {},
        },
        areDivDimsChanged = false,
        { singleDivDims: { byIdx, allIdxs }, multiDivDims: { byId, allIds } } = state.divDimsByGid[gid] ?? {
          singleDivDims: {
            byIdx: {},
            allIdxs: [],
          },
          multiDivDims: {
            byId: {},
            allIds: [],
          },
        };

      // The sub-state dimByUcid with the dimension and some data of the measured cell, stored by
      // its unique cell ID (independent of the group) is always created new, because either the
      // cell is new or its dimension or division has changed.
      const dimByUcid = {
        ...state.dimByUcid,
        [ucid]: {
          dim,
          div,
          isMultiDiv,
        },
      };

      // The sub-state metaDataByGid[gid].allUcids with all unique cell IDs assigned to the given
      // group is only created new, if the cell is new.
      if (isNewCell) {
        areMetaDataChanged = true;
        allUcids = [...allUcids, ucid];
      }

      // The sub-state metaDataByGid[gid].ucidsByDiv with all the unique cell IDs assigned to the
      // divisions of a group is only created new, if the cell is new or if its division has
      // changed.
      if (isNewCell || hasDivChanged) {
        areMetaDataChanged = true;
        ucidsByDiv = {
          ...ucidsByDiv,
          ...(hasDivChanged && {
            [prevDiv!]: ucidsByDiv[prevDiv!]!.filter((u) => (u !== ucid)),
          }),
          [div]: [...(ucidsByDiv[div] ?? []), ucid],
        };
      }

      // If the cell is not new but its division has changed, remove its previous dimension from the
      // previous divison.
      if (hasDivChanged) {
        const wasMultiDiv = state.dimByUcid[ucid]!.isMultiDiv;

        if (ucidsByDiv[prevDiv!]!.length === 0) {
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
        } else if (prevDim === (wasMultiDiv ? byId[prevDiv as string] : byIdx[prevDiv as number])) {
          // b) if there are any other cells assigned to the previous division and if the previous
          // dimension of the cell is equal to the resulting dimension of the previous division,
          // recalculate the last one.
          const nextDivDim = ucidsByDiv[prevDiv!]!.reduce((acc, u) => (
            Math.max(acc, dimByUcid[u]!.dim)
          ), 0);

          if (nextDivDim !== (wasMultiDiv ? byId[prevDiv as string] : byIdx[prevDiv as number])) {
            areDivDimsChanged = true;

            if (wasMultiDiv) {
              byId = { ...byId, [prevDiv as string]: nextDivDim };
            } else {
              byIdx = { ...byIdx, [prevDiv as number]: nextDivDim };
            }
          }
        }
      }

      const prevDivDim = isMultiDiv ? byId[div as string] : byIdx[div as number];
      const isNewDiv = (prevDivDim === undefined);

      // Sub-state divDimsByGid.multiDivDims or divDimsByGid.singleDivDims with the resulting
      // dimensions of the multiple and single division.
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
            allIds = [...allIds, div as string];
          } else {
            allIdxs = [...allIdxs, div as number];
          }
        }
      } else if (!hasDivChanged && (dim < prevDivDim) && (prevDim === prevDivDim)) {
        // b) if the dimension of the (not new) cell is smaller than the resulting dimension, but if
        // it's previous dimension is equal to the resulting dimension (without division change),
        // recalculate it.
        const nextDivDim = ucidsByDiv[div]!.reduce((acc, u) => (
          Math.max(acc, dimByUcid[u]!.dim)
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
        dimByUcid, // always new
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


/**
 * useDimensions action creator to set the measured dimension of a cell.
 *
 * @param gid - The ID of a group, the cell belongs to.
 * @param ucid - The unique ID of the cell. It is unique over all groups.
 * @param startDivIdx - The index of a division of the group where the cell begins.
 * @param endDivIdx - The index of a division of the group where the cell ends.
 * @param dim - The measured dimension of the cell.
 */
export const setCellDim = (gid: string, ucid: string, startDivIdx: number, endDivIdx: number, dim: number): UseDimensionsReducerActions => {
  let div: number | string,
    isMultiDiv: boolean;

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
};


/**
 * useDimensions selector to return a memoized object with the resulted dimensions of all single and
 * multiple divisions of all groups.
 */
export const selectAllDivDims = (state: UseDimensionsReducerState) => state.divDimsByGid;
