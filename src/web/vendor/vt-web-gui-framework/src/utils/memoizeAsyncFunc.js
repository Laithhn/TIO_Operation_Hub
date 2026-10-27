/**
 * Exported function to memoize a given function "asyncFunc" (async or not, it must return a
 * promise). memoizeAsyncFunc returns a new async function. If this returned function is called, its
 * serializable(!) arguments will be serialized and checked. If the returned function was called
 * with the same arguments before, the cached promise is returned. If it was not called with the
 * same arguments before, "asyncFunc" is called with this given arguments and the returned promise
 * is cached and returnd by the returned function. In this way, "asyncFunc" is always called only
 * once and the same promise is returned with each subsequent call. Awesome but great!
 *
 * @param {function} asyncFunc - The given (async) function.
 * @returns {function}
 */
const memoizeAsyncFunc = (asyncFunc) => {
  const cache = {};

  return async (...args) => {
    const argsId = JSON.stringify(args);
    cache[argsId] = cache[argsId] || asyncFunc.apply(this, args);

    return cache[argsId];
  };
};

export default memoizeAsyncFunc;
