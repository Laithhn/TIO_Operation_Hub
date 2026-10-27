import {
  useState, useRef, useCallback, useEffect,
} from 'react';


/**
 * React hook like useCallback to call a given callback function in a throttled way: it is called at
 * the first call of the returned callback function and afterwards at the earliest after the given
 * delay time. The returned callback is memoized and changes, if one of the arguments changes. But
 * the timing is only reseted, if prop "delay" or "noTrailing" changes.
 *
 * Example (delay time is ----):
 * Call of the returned function:            |        | ||   |           |
 * Exec. of the callback (with trailing):    |----    |----|----|----    |----
 * Exec. of the callback (without trailing): |----    |----  |----       |----
 *
 * @param {function} callback - The memoized callback function that is executed at the earliest
 *   after the delay time.
 * @param {object} [options]
 * @param {number} [options.delay=0] - The delay time in milliseconds.
 * @param {boolean} [options.noTrailing=false] - Set to true to disable trailing calls after delay
 *   time.
 * @param {boolean} [options.firstArgIsId=false] - Set to true, if the first argument of the
 *   callback function is an ID to distinguish the timing for each ID.
 * @returns {function}
 */
const useThrottledCallback = (
  callback,
  { delay = 0, noTrailing = false, firstArgIsId = false } = { delay: 0, noTrailing: false, firstArgIsId: false },
) => {
  const lastExecutionTimesRef = useRef({});
  const timeoutsRef = useRef({});


  const throttledCallback = useCallback((...args) => {
    const id = firstArgIsId ? args[0] : 'USE_THROTTLED_CALLBACK_ID';
    const timeElapsedMs = Date.now() - (lastExecutionTimesRef.current[id] ?? 0);

    /**
     * Internal helper function to execute the original callback function.
     */
    const exec = (givenId) => {
      lastExecutionTimesRef.current[givenId] = Date.now();
      callback(...args);
    };

    // clear any existing timeout if exit
    clearTimeout(timeoutsRef.current[id]);

    if (timeElapsedMs > delay) {
      // execute the original callback function, if the delay time has expired in the meantime
      exec(id);
    } else if (noTrailing !== true) {
      // if the delay time is not expired, schedule the callback function to execute "delay" ms
      // after the last execution
      timeoutsRef.current[id] = setTimeout(() => { exec(id); }, delay - timeElapsedMs);
    }
  }, [callback, delay, noTrailing, firstArgIsId]);


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


  return throttledCallback;
};


/**
 *
 */
const useThrottle = (initialValue, delay, noTrailing, firstArgIsId) => {
  const [throttledValue, setValue] = useState(initialValue);

  return [throttledValue, useThrottledCallback(setValue, { delay, noTrailing, firstArgIsId })];
};


export { useThrottle, useThrottledCallback };
