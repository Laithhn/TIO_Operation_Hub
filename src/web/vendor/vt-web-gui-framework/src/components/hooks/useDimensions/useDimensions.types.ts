export interface UseDimensionsHandle {
  clientWidth?: Element['clientWidth'] | undefined;
  clientHeight?: Element['clientHeight'] | undefined;
  scrollLeft?: Element['scrollLeft'] | undefined;
  scrollWidth?: Element['scrollWidth'] | undefined;
  scrollTop?: Element['scrollTop'] | undefined;
  scrollHeight?: Element['scrollHeight'] | undefined;
}


/** The props of the React hook "useDimensions". */
export interface UseDimensionsProps {
  /** The React reference of element, this hook is used for. */
  readonly ref?: React.RefObject<UseDimensionsHandle | null>;
  /** Set to true to switch off the measurement. */
  readonly disable?: boolean;
  /** Set to true to trigger the calculations of the dimensions not by event domChange, but by a
   * continuously animation frame. Bye careful using this option due to performance issues. */
  readonly byAnimationFrame?: boolean;
}


/** The returned value of the React hook "useDimensions". */
export interface UseDimensionsResult {
  clientWidth: number | undefined;
  clientHeight: number | undefined;
  scrollLeft: number | undefined;
  scrollWidth: number | undefined;
  scrollTop: number | undefined;
  scrollHeight: number | undefined;
  /** Function to trigger deriving the dimensions manually. */
  deriveDims: () => void;
}
