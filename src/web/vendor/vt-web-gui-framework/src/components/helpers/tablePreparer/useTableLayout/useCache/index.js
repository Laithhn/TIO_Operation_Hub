import { useRef, useCallback } from 'react';


/**
 * React hook to cache expensive but pure calculations of values. There can be multiple seperate
 * caches, identified by one or multiple nested IDs.
 */
const useCache = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const cacheRef = useRef({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  /**
   * Memoized function to cache the given input values for the given ID(s). If the input values
   * have changed, the calculation of the given function is made (again) and the returned result is
   * cached. If the input values are the same as at the last call, the cached result of the former
   * calculation is returned.
   * The fist argument of this function is the ID of the cache or an array with multiple nested IDs.
   * The last argument is the function for the calculation and all arguments between are the input
   * values.
   *
   * @param {string|number|[]} ids - The ID(s) of the used cache. Can be nested by an array if IDs.
   */
  const cache = useCallback((ids, ...inputs) => {
    if (inputs.length < 2) {
      throw new Error(`VIWGF/Components/Helpers > TablePreparer/useTableLayout/useCache > cache(): the given arguments for the input values and the calculation function are too less (${inputs.length}). There must be at least one input value and one calculation function.`);
    }

    const func = inputs.pop();
    const areMultipleIds = Array.isArray(ids);
    let partialCache = areMultipleIds
      ? ids.reduce((acc, id) => acc?.[id], cacheRef.current)
      : cacheRef.current[ids];

    if (
      !partialCache
      || (inputs.length !== partialCache.inputs.length)
      || inputs.some((input, i) => (input !== partialCache.inputs[i]))
    ) {
      // create the partial cache if it doesn't exist for the given ID(s)
      if (!partialCache) {
        partialCache = (areMultipleIds ? ids : [ids]).reduce((acc, id) => {
          if (!acc[id]) {
            acc[id] = {};
          }
          return acc[id];
        }, cacheRef.current);
      }

      // Cache the given inputs and call the function with them. The previous result is also given
      // to the function. After calculating (again) cache the returned value.
      partialCache.inputs = inputs;
      partialCache.output = func(...inputs, partialCache.output);
    }

    return partialCache.output;
  }, []);


  /**
   * Memoized function with no dependencies to clear the cache of the given ID(s). If there is no ID
   * given, the whole cache is deleted.
   *
   * @param {string|number|[]} ids - The ID(s) of the used cache.
   */
  const clearCache = useCallback((ids) => {
    if (ids === undefined) {
      cacheRef.current = {};
    } else if (Array.isArray(ids)) {
      ids.reduce((acc, id, i) => {
        if (i === (ids.length - 1)) {
          delete acc?.[id];
        }
        return acc?.[id];
      }, cacheRef.current);
    } else if (cacheRef.current[ids]) {
      delete cacheRef.current[ids];
    }
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
    cache,
    clearCache,
  };
  //                                                                                  </editor-fold>
};

export default useCache;
