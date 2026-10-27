/**
 * Throttle execution of a callback function. Especially useful for rate limiting execution of
 * handlers on events like resize and scroll.
 *
 * @param {function} callback - A function to be executed after delay milliseconds. The "this"
 *   context and all arguments are passed through to the callback function when the throttled
 *   function is executed.
 * @param {number} delay - A zero-or-greater delay in milliseconds. For event callbacks, values
 *   around 100 or 250 (or even higher) are most useful.
 * @param {boolean} [noTrailing=false] - Optional (default: false) if set to true, the callback
 *   function will only execute every delay milliseconds while the throttled-function is being
 *   called. If noTrailing is false or not set, the callback function will be executed one final
 *   time after the last throttled-function call. After the throttled-function has not been called
 *   for delay milliseconds, the internal counter is reset.
 * @returns {function} The new throttled function.
 */
const throttle = (callback, delay = 0, noTrailing = false) => {
  let timeout,
    lastExecutionTime = 0;


  /**
   * Returned wrapper function that encapsulates all of the throttling functionality. When executed
   * it limit the rate at which the callback function is executed.
   */
  function wrapper(...args) {
    const self = this;
    const timeElapsedMs = Date.now() - lastExecutionTime;


    /**
     * Execute the callback function and update the last execution timestamp.
     */
    const exec = () => {
      lastExecutionTime = Date.now();
      callback.apply(self, args);
    };


    // clear any existing timeout
    if (timeout) {
      clearTimeout(timeout);
    }

    if (timeElapsedMs > delay) {
      // execute the callback function, if the delay time has been exceeded
      exec();
    } else if (noTrailing !== true) {
      // if the delay time has not been exceeded, schedule the callback function to execute "delay"
      // ms after the most recent execution
      timeout = setTimeout(exec, delay - timeElapsedMs);
    }
  }

  wrapper.cancel = () => {
    clearTimeout(timeout);
    timeout = undefined;
    lastExecutionTime = 0;
  };

  return wrapper;
};

export default throttle;
