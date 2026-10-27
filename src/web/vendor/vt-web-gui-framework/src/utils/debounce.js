/**
 * Debounce execution of a callback function. Debouncing guarantees that a function is only executed
 * a single time, either at the very beginning of a series of calls or at the very end.
 *
 * @param {function} callback - A function to be executed after delay milliseconds. The "this"
 *   context and all arguments are passed through to the callback function when the debounced
 *   function is executed.
 * @param {number} delay - A zero-or-greater delay in milliseconds. For event callbacks, values
 *   around 100 or 250 (or even higher) are most useful.
 * @param {boolean} [atBegin=false] - Optional (defaults: false) if set to true, the callback
 *   function will be executed only at the first debounced function call. After the debounced
 *   function has not been called for "delay" milliseconds, the internal counter is reset. If
 *   atBegin is set to false or not set, the callback function will only be executed "delay"
 *   milliseconds after the last debounced function call.
 * @returns {function} The new debounced function.
 */
const debounce = (callback, delay = 0, atBegin = false) => {
  let timeout;


  /**
   * Returned wrapper function that encapsulates all of the debouncing functionality. When executed
   * it limit the rate at which the callback function is executed.
   */
  function wrapper(...args) {
    const self = this;


    /**
     * Execute the callback function.
     */
    const exec = () => {
      callback.apply(self, args);
    };


    /**
     * Clear the timeout handle.
     */
    const clear = () => {
      timeout = undefined;
    };


    if (atBegin && !timeout) {
      // If atBegin is true and the wrapper is called the first time, execute the callback function.
      exec();
    }

    // clear any existing timeout
    if (timeout) {
      clearTimeout(timeout);
    }


    // If atBegin is true, schedule clear() to execute after "delay" ms. If atBegin is false,
    // schedule the callback function to execute after "delay" ms.
    timeout = setTimeout(atBegin ? clear : exec, delay);
  }

  wrapper.cancel = () => {
    clearTimeout(timeout);
    timeout = undefined;
  };

  return wrapper;
};

export default debounce;
