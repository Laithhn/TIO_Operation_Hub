export type CacheId = string | number;

export interface CacheValue<O = unknown> {
  inputs: unknown[];
  output: O;
}


/** The returned value of the React hook "useCache". */
export interface UseCacheResult {
  readonly cache: <I extends unknown[], O>(id: CacheId, inputs: I, func: (prevOutput: O | undefined, ...inputs: I) => O) => O;
  readonly clearCache: (id?: CacheId) => void;
}
