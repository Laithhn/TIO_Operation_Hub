import { useCallback, useEffect, useRef } from 'react';

import type { UseThrottledCallbackFunction, UseThrottledCallbackOptions } from './useThrottledCallback.types';


/**
 * React hook like useCallback to call a given callback function in a throttled way: it is called at
 * the first call of the returned callback function and afterwards at the earliest after the given
 * delay time. The returned callback is memoized and changes, if one of the arguments changes. But
 * the timing is only reseted, if prop "delay" or "noTrailing" changes.
 *
 * The returned callback keeps its useCallback: a project may list it in the dependencies of its own
 * effects, which the framework does not see, so its stable identity is part of this hook's
 * contract.
 *
 * Example (delay time is ----):
 * Call of the returned function:            |        | ||   |           |
 * Exec. of the callback (with trailing):    |----    |----|----|----    |----
 * Exec. of the callback (without trailing): |----    |----  |----       |----
 */
export const useThrottledCallback = <T extends unknown[]>(
  /** The memoized callback function that is executed at the earliest after the delay time. */
  callback: UseThrottledCallbackFunction<T>,
  { delay = 0, noTrailing = false, firstArgIsId = false }: UseThrottledCallbackOptions = { delay: 0, noTrailing: false, firstArgIsId: false },
): UseThrottledCallbackFunction<T> => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const lastExecutionTimesRef = useRef<Record<string, number>>({});
  const timeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const throttledCallback = useCallback((...args: T) => {
    const id = (firstArgIsId && (typeof args[0] === 'string') && (args[0] !== ''))
      ? args[0]
      : 'USE_THROTTLED_CALLBACK_ID';
    const timeElapsedMs = Date.now() - (lastExecutionTimesRef.current[id] ?? 0);

    /**
     * Internal helper function to execute the original callback function.
     */
    const exec = (givenId: string) => {
      lastExecutionTimesRef.current[givenId] = Date.now();

      callback(...args);
    };

    // clear any existing timeout if exit
    clearTimeout(timeoutsRef.current[id]);

    if (timeElapsedMs > delay) {
      // execute the original callback function, if the delay time has expired in the meantime
      exec(id);
    } else if (!noTrailing) {
      // if the delay time is not expired, schedule the callback function to execute "delay" ms
      // after the last execution
      timeoutsRef.current[id] = setTimeout(() => {
        exec(id);
      }, delay - timeElapsedMs);
    }
  }, [callback, delay, noTrailing, firstArgIsId]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // Reset the execution timing, if prop "delay", "noTrailing" or "firstArgIsId" changes. Note, that
  // the timing is not reseted, if the callback function changes!
  useEffect(() => () => {
    Object.keys(timeoutsRef.current).forEach((id) => {
      clearTimeout(timeoutsRef.current[id]);
    });

    Object.keys(lastExecutionTimesRef.current).forEach((id) => {
      lastExecutionTimesRef.current[id] = 0;
    });
  }, [delay, noTrailing, firstArgIsId]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return throttledCallback;
  //                                                                                  </editor-fold>
};
