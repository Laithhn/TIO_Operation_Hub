import { useCallback, useReducer, useRef } from 'react';

import { isNumber } from 'utils/type';

import { useCache } from '../useCache/useCache';

import {
  initialState as dimsInitialState, reducer as dimsReducer, selectAllDivDims, setCellDim,
} from './useDimensions.reducer';
import type { UseDimensionsProps, UseDimensionsResult } from './useDimensions.types';


/**
 * React hook to measure the one dimensional dimensions (height or width) of groups of divisions.
 *
 * Its functions keep their useCallback: useTableLayout hands them on into the function
 * deriveParamsForTable of the TablePreparer, whose identity decides when the table is derived anew
 * (see useTableLayout).
 */
const useDimensions = ({
  getDefaultDimensions, getDivisionGap, getAdditionalDimension, defaultAverageTotalDimension,
}: UseDimensionsProps): UseDimensionsResult => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [dimsState, dimsDispatch] = useReducer(dimsReducer, dimsInitialState);
  const allDivDims = selectAllDivDims(dimsState);

  const averageTotalDimRef = useRef({
    isEnabled: isNumber(defaultAverageTotalDimension, { withoutInfinite: true, gte: 0 }),
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
   * Function to return the cached dimensions of all divisions of a group, selected
   * by the group ID. The dimensions are only recalcluated and cached, if there are changes in the
   * used data.
   */
  const getDimensions: UseDimensionsResult['getDimensions'] = useCallback((gid: string) => cache(
    gid,
    [
      getDefaultDimensions(gid),
      getDivisionGap ? getDivisionGap(gid) : 0,
      getAdditionalDimension ? getAdditionalDimension(gid) : 0,
      allDivDims[gid],
    ],
    (
      prevValue,
      defDims: ReturnType<typeof getDefaultDimensions>,
      divGap: number,
      addDim: number,
      divDims: (typeof allDivDims)[keyof (typeof allDivDims)] | undefined,
    ) => {
      const dims: (null | number)[] = [];
      const joinedDimsArr: string[] = [];
      let numVisibleDivs = 0,
        totalDim = 0;

      // -------------------------------------------------------------------------------------------
      // Build the dimensions array with the default dimensions and the measurements of the single
      // divisions (from reducer) if available:
      // - null if the division is hidden,
      // - the default dimension as fix value, if the division has not to be measured,
      // - the default dimension, if the division was not yet measured,
      // - the minimum between the default dimension and the measured dimension, if the division has
      //   to be measured and was already measured.
      // -------------------------------------------------------------------------------------------

      for (let divIdx = 0; divIdx < defDims.length; ++divIdx) {
        const defDim = defDims[divIdx];

        if (!defDim) {
          // hidden division
          dims.push(null);
        } else {
          numVisibleDivs++;

          if (!defDim.measure) {
            // division with fix dimension (no measurement)
            dims.push(defDim.dim);
          } else {
            dims.push(Math.max(defDim.dim, divDims?.singleDivDims.byIdx[divIdx] ?? defDim.dim));
          }
        }
      }

      // -------------------------------------------------------------------------------------------
      // If there are cells, that spans multiple divisions, derive the dimensions of their single
      // divisions and apply them to the result dimensions array too.
      // -------------------------------------------------------------------------------------------

      for (const divId of divDims?.multiDivDims.allIds ?? []) {
        const [startDivIdx, endDivIdx] = divId.split('-').map((divIdx) => Number(divIdx)) as [number, number];
        const multiDivDim = divDims!.multiDivDims.byId[divId]!;
        let numDivs = 0,
          sumSingleDivDims = 0,
          sumFixDims = 0;

        // calculate the total dimension of the single divisions derived before and of the not
        // measured divisions with the gaps (fix part)
        for (let divIdx = startDivIdx; divIdx <= endDivIdx; divIdx++) {
          if (defDims[divIdx]) {
            numDivs++;

            if (defDims[divIdx]?.measure) {
              sumSingleDivDims += dims[divIdx]!;
            } else {
              sumFixDims += dims[divIdx]!;
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
              dims[divIdx] = Math.ceil(dims[divIdx]! * factor);
            }
          }
        }
      }

      // -------------------------------------------------------------------------------------------
      // Derive the total dimension of all visible divisions and the joined dimensions string.
      // -------------------------------------------------------------------------------------------

      for (let divIdx = 0; divIdx < dims.length; divIdx++) {
        const dim = dims[divIdx];

        if ((dim !== null) && (dim !== undefined)) {
          if (defDims[divIdx]?.measure === true) {
            joinedDimsArr.push(`minmax(${dim}px, auto)`);
          } else if (defDims[divIdx]?.measure) {
            joinedDimsArr.push(`minmax(${dim}px, ${defDims[divIdx]!.measure})`);
          } else {
            joinedDimsArr.push(`${dim}px`);
          }

          totalDim += dim;
        }
      }

      totalDim += (divGap * (numVisibleDivs - 1)) + addDim;

      const joinedDims = joinedDimsArr.join(' ');

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

      if (averageTotalDimRef.current.isEnabled && (totalDim !== prevValue?.totalDim)) {
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
   * Function to return the average of the total dimensions of all groups, which
   * dimensions are queried by function getDimensions before.
   */
  const getAverageTotalDimension = useCallback(() => averageTotalDimRef.current.average, []);


  /**
   * Function to set the measured dimension of a cell belonging to a group,
   * selected by a given group ID and unique cell ID.
   */
  const setCellDimension = useCallback((gid: string, ucid: string, startDivIdx: number, endDivIdx: number, dim: number) => {
    dimsDispatch(setCellDim(gid, ucid, startDivIdx, endDivIdx, dim));
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


export { useDimensions };
