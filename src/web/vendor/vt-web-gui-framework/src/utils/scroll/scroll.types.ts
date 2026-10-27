export type Easing = 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad' | 'easeInCubic'
  | 'easeOutCubic' | 'easeInOutCubic' | 'easeInQuart' | 'easeOutQuart' | 'easeInOutQuart'
  | 'easeInQuint' | 'easeOutQuint' | 'easeInOutQuint';


export interface ScrollOptions {
  /** Optionally set to true, if parameter "to" is a difference and not an absolute value. */
  isDiff?: boolean | undefined;
  /** Optionally set to true, if the reading direction is right-to-left. */
  isRtl?: boolean | undefined;
  /** The optional scrolling time in milliseconds. Default: 200. */
  duration?: number | undefined;
  /** The optional name of the easing function. Default: "linear" */
  easing?: Easing | undefined;
  /** An optional callback function that is called each time, scrollTop or scrollLeft of the element
   * was set. */
  callback?: (() => void) | undefined;
}
