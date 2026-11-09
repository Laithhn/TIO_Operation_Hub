export type UseThrottledCallbackFunction<T extends unknown[]> = (...args: T) => void;


/** The options of the React hook "useThrottledCallback". */
export interface UseThrottledCallbackOptions {
  /** The delay time in milliseconds. */
  readonly delay?: number;
  /** Set to true to disable trailing calls after delay time. */
  readonly noTrailing?: boolean;
  /** Set to true, if the first argument of the callback function is an ID to distinguish the timing
   * for each ID. The ID must be an not empty string. */
  readonly firstArgIsId?: boolean;
}
