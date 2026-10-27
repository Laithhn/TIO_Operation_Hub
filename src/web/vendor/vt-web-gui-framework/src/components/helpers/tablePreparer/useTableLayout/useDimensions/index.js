import { useReducer, useRef, useCallback } from 'react';

import useCache from '../useCache';
import dimsReducer, { initialState as dimsInitialState, selectors as dimsSelectors, actions as dimsActions } from './dimensionsReducer';


/**
 * External helper function to split a given multiple division ID into an array with the indexes of
 * the first and last single division. Note that the splited indexes are parsed into numbers but not
 * checked if valid.
 *
 * @param {string} divId - The ID of a multiple division.
 * @returns {number[]}
 */
const splitMultiDivision = (divId) => divId.split('-').map((divIdx) => parseInt(divIdx, 10));


/**
 * React hook to measure the one dimensional dimensions (height or width) of groups of divisions.
 *
 * @param {object} props
 * @param {function} props.getDefaultDimensions - A function returning an array with the dimension
 *   information of all divisions of a group (given as argument). The indexes of the array are the
 *   indexes of the divisions. If a division is marked as hidden, the value has to be null.
 *   Otherwise the values have to be objects with the fields "dim" and "measure". If "measure" is
 *   false or not set, "dim" is the fix dimension of the division as number. If the division has to
 *   be measured, "dim" is the minimium dimension of it and "measure" has to be true (means "auto"),
 *   "auto" or "min-content".
 * @param {function} [props.getDivisionGap] - Optionally a function, returning the gap as number
 *   between all divisions of a group (given as argument).
 * @param {function} [props.getAdditionalDimension] - Optionally a function, returning the
 *   additional dimension as number for a group (given as argument).
 * @param {number} [props.defaultAverageTotalDimension] - Optionally the start value for the default
 *   average of the total dimensions for all groups.
 */
const useDimensions = ({
  getDefaultDimensions, getDivisionGap, getAdditionalDimension, defaultAverageTotalDimension,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [dimsState, dimsDispatch] = useReducer(dimsReducer, dimsInitialState());
  const allDivDims = dimsSelectors.getAllDivisionDimensions(dimsState);

  const averageTotalDimRef = useRef({
    enable: (Number.isFinite(defaultAverageTotalDimension) && (defaultAverageTotalDimension >= 0)),
    sum: 0,
    num: 0,
    average: defaultAverageTotalDimension ?? 0,
  });


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const { cache } = useCache();


  /**
   * @typedef {object} UseDimensionsGetDimensions
   * @property {number[]} dims - Array with the resulted dimension values of the divisions. If a
   *   division is marked as hidden, the value here is null. So the length of this array is equal to
   *   the total number of hidden and visible divisions of the group.
   * @property {number} totalDim - The total dimension as sum of the dimensions of all visible
   *   divisions of the group inclusive the gaps between them and the optional additional dimension.
   * @property {string} joinedDims - A string with the dimension values of all visible(!) divisions,
   *   that can be used for CSS property grid-template-columns or grid-template-rows. Hidden
   *   divisions are not considered here! For all divisions that have to be measured,
   *   "minmax(<dim>px, auto)" or "minmax(<dim>px, min-content)" is taken in the string instead of
   *   "<dim>px".
   */

  /**
   * Memoized function to return the cached dimensions of all divisions of a group, selected by the
   * group ID. The dimensions are only recalcluated and cached, if there are changes in the used
   * data.
   *
   * @param {string|number} gid - The group ID.
   * @returns {UseDimensionsGetDimensions}
   */
  const getDimensions = useCallback((gid) => cache(
    gid,
    getDefaultDimensions(gid),
    getDivisionGap ? getDivisionGap(gid) : 0,
    getAdditionalDimension ? getAdditionalDimension(gid) : 0,
    allDivDims[gid],
    (defDims, divGap, addDim, divDims, prevValue) => {
      let numVisibleDivs = 0,
        joinedDims = [];

      // -------------------------------------------------------------------------------------------
      // Build the dimensions array with the default dimensions and the measurements of the single
      // divisions (from reducer) if available:
      // - null if the division is hidden,
      // - the default dimension as fix value, if the division has not to be measured,
      // - the default dimension, if the division was not yet measured,
      // - the minimum between the default dimension and the measured dimension, if the division has
      //   to be measured and was already measured.
      // -------------------------------------------------------------------------------------------

      const dims = defDims.map((defDim, divIdx) => {
        if (!defDim) {
          // hidden division
          return null;
        }

        numVisibleDivs++;

        if (!defDim.measure) {
          // division with fix dimension (no measurement)
          return defDim.dim;
        }

        return Math.max(defDim.dim, divDims?.singleDivDims.byIdx[divIdx] ?? defDim.dim);
      });

      // -------------------------------------------------------------------------------------------
      // If there are cells, that spans multiple divisions, derive the dimensions of their single
      // divisions and apply them to the result dimensions array too.
      // -------------------------------------------------------------------------------------------

      (divDims?.multiDivDims.allIds ?? []).forEach((divId) => {
        const [startDivIdx, endDivIdx] = splitMultiDivision(divId);
        const multiDivDim = divDims.multiDivDims.byId[divId];
        let numDivs = 0,
          sumSingleDivDims = 0,
          sumFixDims = 0;

        // calculate the total dimension of the single divisions derived before and of the not
        // measured divisions with the gaps (fix part)
        for (let divIdx = startDivIdx; divIdx <= endDivIdx; divIdx++) {
          if (defDims[divIdx]) {
            numDivs++;

            if (defDims[divIdx].measure) {
              sumSingleDivDims += dims[divIdx];
            } else {
              sumFixDims += dims[divIdx];
            }
          }
        }

        sumFixDims += (divGap * (numDivs - 1));

        // if the measured dimension of the multiple division cell is larger than the summarized
        // dimension of its single divisions, increase the dimensions of the single divisions
        // proportionally
        if (multiDivDim > (sumSingleDivDims + sumFixDims)) {
          const factor = (multiDivDim - sumFixDims) / sumSingleDivDims;

          for (let divIdx = startDivIdx; divIdx <= endDivIdx; divIdx++) {
            if (defDims[divIdx]?.measure) {
              dims[divIdx] = Math.ceil(dims[divIdx] * factor);
            }
          }
        }
      });

      // -------------------------------------------------------------------------------------------
      // Derive the total dimension of all visible divisions and the joined dimensions string.
      // -------------------------------------------------------------------------------------------

      const totalDim = dims.reduce((acc, dim, divIdx) => {
        if (dim === null) {
          return acc;
        }

        if (defDims[divIdx].measure === true) {
          joinedDims.push(`minmax(${dim}px, auto)`);
        } else if (defDims[divIdx].measure) {
          joinedDims.push(`minmax(${dim}px, ${defDims[divIdx].measure})`);
        } else {
          joinedDims.push(`${dim}px`);
        }

        return acc + dim;
      }, 0) + (divGap * (numVisibleDivs - 1)) + addDim;

      joinedDims = joinedDims.join(' ');


      // -------------------------------------------------------------------------------------------
      // If the joined dimensions string hasn't changed compared to the previous calculation, the
      // dimension array and the total dimension must also be the same. In this case, return the
      // previous value to further improve the performance.
      // -------------------------------------------------------------------------------------------

      if (joinedDims === prevValue?.joinedDims) {
        return prevValue;
      }

      // -------------------------------------------------------------------------------------------
      // Calculate the average dimension of all groups and set the resulted dimensions.
      // -------------------------------------------------------------------------------------------

      if (averageTotalDimRef.current.enable && (totalDim !== prevValue?.totalDim)) {
        if (prevValue) {
          averageTotalDimRef.current.sum -= prevValue.totalDim;
          averageTotalDimRef.current.num--;
        }

        averageTotalDimRef.current.sum += totalDim;
        averageTotalDimRef.current.num++;

        averageTotalDimRef.current.average = Math.round(
          averageTotalDimRef.current.sum / averageTotalDimRef.current.num,
        );
      }

      return {
        dims,
        totalDim,
        joinedDims,
      };
    },
  ), [getDefaultDimensions, getDivisionGap, getAdditionalDimension, allDivDims, cache]);


  /**
   * Memoized function to return the average of the total dimensions of all groups, which dimensions
   * are queried by function getDimensions before.
   *
   * @returns {number}
   */
  const getAverageTotalDimension = useCallback(() => averageTotalDimRef.current.average, []);


  /**
   * Memoized function to set the measured dimension of a cell belonging to a group, selected by a
   * given group ID and unique cell ID.
   *
   * @param {string|number} gid - The group ID.
   * @param {string} ucid - The unique ID of a cell (is unique over all groups).
   * @param {number} startDivIdx - The index of the first division this cell spans.
   * @param {number} endDivIdx - The index of the last division this cell spans.
   * @param {number} dim - The measured dimension of the cell spans across the divisions.
   */
  const setCellDimension = useCallback((gid, ucid, startDivIdx, endDivIdx, dim) => {
    dimsDispatch(dimsActions.setCellDimension(gid, ucid, startDivIdx, endDivIdx, dim));
  }, []);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return {
    getDimensions,
    getAverageTotalDimension,
    setCellDimension,
  };
  //                                                                                  </editor-fold>
};

export default useDimensions;
