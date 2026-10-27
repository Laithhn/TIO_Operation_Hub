import {
  useState, useRef, useCallback, useEffect,
} from 'react';


const defaultDims = {
  clientWidth: 0,
  scrollWidth: 0,
  scrollLeft: 0,
  clientHeight: 0,
  scrollHeight: 0,
  scrollTop: 0,
};


/**
 * React hook to derive the dimensions of an element, given by its React reference. Either the
 * document event "domChange" is used to trigger the measurement or a continuously running animation
 * frame. Before the initial measurement 0 is returned for each dimension.
 *
 * @param {object} elementRef - The React reference of the element to measure.
 * @param {object} options
 * @param {boolean} [options.disabled=false] - Optionally set to true to switch off the measurement.
 * @param {boolean} [options.byAnimationFrame=false] - Optionally set to true to trigger the
 *   calculations of the dimensions not by event domChange, but by a continuously animation frame.
 *   Bye careful using this option due to performance issues.

 * @returns {{ clientWidth: number, scrollWidth: number, scrollLeft: number, clientHeight: number, scrollHeight: number, scrollTop: number, deriveDims: function }}
 */
const useDimensions = (elementRef, { disabled = false, byAnimationFrame = false } = { disabled: false, byAnimationFrame: false }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [dims, setDims] = useState(defaultDims);

  const reqAnimFrameRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Function to set the dimensions of the given container to the internal state.
   */
  const deriveDims = useCallback(() => {
    setDims((prevDims) => {
      const {
        clientWidth, scrollWidth, scrollLeft, clientHeight, scrollHeight, scrollTop,
      } = elementRef?.current ?? defaultDims;

      return (
        (clientWidth !== prevDims.clientWidth)
        || (clientHeight !== prevDims.clientHeight)
        || (scrollWidth !== prevDims.scrollWidth)
        || (scrollLeft !== prevDims.scrollLeft)
        || (scrollHeight !== prevDims.scrollHeight)
        || (scrollTop !== prevDims.scrollTop)
      )
        ? {
          clientWidth, scrollWidth, scrollLeft, clientHeight, scrollHeight, scrollTop,
        }
        : prevDims;
    });

    if (byAnimationFrame) {
      reqAnimFrameRef.current = requestAnimationFrame(deriveDims);
    }
  }, [elementRef, byAnimationFrame]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const handleDeriveDims = useCallback(() => {
    if (!byAnimationFrame) {
      deriveDims();
    }
  }, [byAnimationFrame, deriveDims]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (!disabled && !byAnimationFrame) {
      document.addEventListener('domChange', deriveDims);
      deriveDims();

      return () => {
        document.removeEventListener('domChange', deriveDims);
      };
    }

    if (!disabled && byAnimationFrame) {
      reqAnimFrameRef.current = requestAnimationFrame(deriveDims);

      return () => {
        cancelAnimationFrame(reqAnimFrameRef.current);
      };
    }

    return undefined;
  }, [disabled, byAnimationFrame, deriveDims]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return {
    ...dims,
    deriveDims: handleDeriveDims,
  };
  //                                                                                  </editor-fold>
};

export default useDimensions;
