import { useImperativeHandle, useRef } from 'react';

import { space } from 'assets/styles';
import { useStylingProps } from 'components/hooks/useStylingProps';

import { Bars } from './bars/Bars';
import { Circle } from './circle/Circle';
import { type SpinnerProps, spinnerStylingProps } from './spinner.types';


const DIM_MIN = 16;
const DIM_MAX = space.xxxl;


/**
 * React component of the indicator component "Spinner" to show an animated loading spinner with
 * selectable appearance (type) and dimension.
 */
const Spinner = ({
  ref, type = 'circle', dim = space.xxl, ...restProps
}: SpinnerProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const spinnerElemRef = useRef<HTMLSpanElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, spinnerStylingProps);

  const normDim = Math.round(Math.max(DIM_MIN, Math.min(DIM_MAX, dim)));


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    clientLeft: spinnerElemRef.current?.clientLeft,
    clientWidth: spinnerElemRef.current?.clientWidth,
    clientTop: spinnerElemRef.current?.clientTop,
    clientHeight: spinnerElemRef.current?.clientHeight,
    getBoundingClientRect: () => spinnerElemRef.current?.getBoundingClientRect(),
  }), []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (type === 'bars') {
    return (
      <Bars ref={spinnerElemRef} dim={normDim} style={outerElemStyle} />
    );
  }

  return (
    <Circle ref={spinnerElemRef} dim={normDim} style={outerElemStyle} />
  );
  //                                                                                  </editor-fold>
};

Spinner.displayName = 'Spinner';


export { Spinner };
