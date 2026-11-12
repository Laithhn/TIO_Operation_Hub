import {
  useCallback, useEffect, useRef, useState,
} from 'react';

import type { UseDimensionsProps, UseDimensionsResult } from './useDimensions.types';


const defaultDims: Pick<UseDimensionsResult, 'clientWidth' | 'clientHeight' | 'scrollLeft' | 'scrollWidth' | 'scrollTop' | 'scrollHeight'> = {
  clientWidth: undefined,
  clientHeight: undefined,
  scrollLeft: undefined,
  scrollWidth: undefined,
  scrollTop: undefined,
  scrollHeight: undefined,
};


/**
 * React hook "useDimensions" to derive the dimensions of an element, given by its React reference.
 * Either the document event "domChange" is used to trigger the measurement or a continuously
 * running animation frame. Before the initial measurement 0 is returned for each dimension.
 */
export const useDimensions = ({
  ref, disable = false, byAnimationFrame = false,
}: UseDimensionsProps): UseDimensionsResult => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [dims, setDims] = useState(defaultDims);

  const reqAnimFrameRef = useRef<ReturnType<typeof requestAnimationFrame>>(0);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to set the dimensions of the given container to the internal
   * state.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const deriveDims = useCallback(() => {
    setDims((prevDims) => {
      const {
        clientWidth, clientHeight, scrollLeft, scrollWidth, scrollTop, scrollHeight,
      } = ref?.current ?? defaultDims;

      return (
        (clientWidth !== prevDims.clientWidth)
        || (clientHeight !== prevDims.clientHeight)
        || (scrollLeft !== prevDims.scrollLeft)
        || (scrollWidth !== prevDims.scrollWidth)
        || (scrollTop !== prevDims.scrollTop)
        || (scrollHeight !== prevDims.scrollHeight)
      )
        ? {
          clientWidth, scrollHeight, scrollLeft, scrollWidth, scrollTop, clientHeight,
        }
        : prevDims;
    });
  }, [ref]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    // Derive the dimensions by the domChange event.
    if (!disable && !byAnimationFrame) {
      document.addEventListener('domChange', deriveDims);
      deriveDims();

      return () => {
        document.removeEventListener('domChange', deriveDims);
      };
    }

    // Derive the dimensions by an animation frame.
    if (!disable && byAnimationFrame) {
      const animate = () => {
        deriveDims();
        reqAnimFrameRef.current = requestAnimationFrame(animate);
      };

      reqAnimFrameRef.current = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(reqAnimFrameRef.current);
      };
    }

    return undefined;
  }, [disable, byAnimationFrame, deriveDims]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return {
    ...dims,
    deriveDims,
  };
  //                                                                                  </editor-fold>
};
