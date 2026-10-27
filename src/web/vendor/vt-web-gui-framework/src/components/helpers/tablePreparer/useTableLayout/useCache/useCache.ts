import { useCallback, useRef } from 'react';

import type { CacheId, CacheValue, UseCacheResult } from './useCache.types';


/**
 * React hook to cache expensive but pure calculations of values.
 *
 * Its two functions keep their useCallback: the functions of useDimensions and useTableLayout
 * depend on them, and the identities of those decide when the TablePreparer derives the table anew
 * (see useTableLayout).
 */
const useCache = (): UseCacheResult => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const cacheRef = useRef(new Map<CacheId, CacheValue>());


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Function with no dependencies to cache the given input values for the given
   * ID. If the input values have changed, the calculation of the given function is made (again) and
   * the returned result is also cached. If the input values are the same as at the last call, the
   * cached result of the former calculation is returned. Note that the given function has to be
   * pure (same inputs lead to the same output)!
   */
  const cache = useCallback(<I extends unknown[], O>(id: CacheId, inputs: I, func: (prevOutput: O | undefined, ...inputs: I) => O): O => {
    let deriveNew = false,
      prevOutput: O | undefined;

    if (!cacheRef.current.has(id)) {
      deriveNew = true;
    } else {
      const map = cacheRef.current.get(id) as CacheValue<O>;

      if (map.inputs.length !== inputs.length) {
        deriveNew = true;
        prevOutput = map.output;
      } else {
        for (let i = 0; i < map.inputs.length; i++) {
          if (map.inputs[i] !== inputs[i]) {
            deriveNew = true;
            prevOutput = map.output;
            break;
          }
        }
      }
    }

    if (deriveNew) {
      cacheRef.current.set(id, {
        inputs,
        output: func(prevOutput, ...inputs),
      });
    }

    return (cacheRef.current.get(id) as CacheValue<O>).output;
  }, []);


//  const testFunc = useCallback((x: number, y: number) => {
//    const ret = cache(
//      'myId',
//      [x, y],
//      (prevSum: number | undefined, a: number, b: number) => Math.max(prevSum ?? 0, a + b),
//    );
//
//    return ret;
//  }, [cache]);


  /**
   * Function with no dependencies to clear the cache of the given ID. If there is
   * no ID given, the whole cache is deleted.
   */
  const clearCache = useCallback((id?: CacheId) => {
    if (id === undefined) {
      cacheRef.current.clear();
    } else if (cacheRef.current.has(id)) {
      cacheRef.current.delete(id);
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


export { useCache };
