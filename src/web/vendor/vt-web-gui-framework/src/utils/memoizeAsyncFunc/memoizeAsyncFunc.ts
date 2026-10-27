/**
 * Exported function to memoize a given asynchronous and pure(!) function "asyncFunc", that must
 * return a promise. memoizeAsyncFunc returns a new asynchronous function. If this returned function
 * is called, its serializable(!) arguments will be serialized and checked. If the returned function
 * was called with the same arguments before, it is resolved with the cached result. If it was not
 * called with the same arguments before, "asyncFunc" is called with this given arguments and the
 * returned result is cached. The returned function is resolved with this result.
 *
 * If the returned function is called during a previous call is waiting for "asyncFunc", its
 * resolver function is queued and executed, when the first call is resolved.
 */
export const memoizeAsyncFunc = <Result>(asyncFunc: () => Promise<Result>): () => Promise<Result> => {
  // the cache of results, returned from "asyncFunc" before
  const cache: Record<string, Result> = {};
  // true, if a call of "asyncFunc" is still running
  const inProgress: Record<string, boolean> = {};
  // a queue with resolvers, waiting for resolving a previous and still running call of "asyncFunc"
  const promiseQueue: Record<string, ((value: Result) => void)[]> = {};

  return async (...args: []) => {
    // The ID for the cache, created by serializing the given arguments. If no arguments are given,
    // the ID will be "[]".
    const argsId = JSON.stringify(args);

    if (cache[argsId]) {
      return Promise.resolve(cache[argsId]);
    }

    if (inProgress[argsId]) {
      return new Promise((resolve) => {
        (promiseQueue[argsId] ??= []).push(resolve);
      });
    }
    inProgress[argsId] = true;

    return new Promise((resolve, reject) => {
      asyncFunc(...args).then((result) => {
        cache[argsId] = result;
        resolve(result);

        (promiseQueue[argsId] ?? []).forEach((queuedResolve) => {
          queuedResolve(result);
        });

        promiseQueue[argsId] = [];
        inProgress[argsId] = false;
      }).catch((e: unknown) => {
        if (e instanceof Error) {
          reject(e);
        } else if ((typeof e === 'string') && (e !== '')) {
          reject(new Error(`VIWGF: an error occured while executing memoized function "${asyncFunc.name || '?'}": ${e}`));
        } else {
          reject(new Error(`VIWGF: an unknown error occured while executing memoized function "${asyncFunc.name || '?'}".`));
        }
      });
    });
  };
};
