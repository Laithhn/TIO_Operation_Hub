import { classNames } from 'utils/classNames';

import * as css from './circle.scss';
import type { CircleProps } from './circle.types';


/**
 * React sub-component of a rotating circle spinner of the indicator component "Spinner".
 */
const Circle = ({
  ref, dim, style,
}: CircleProps) => {
  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const borderWidth = Math.ceil(dim / 10);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const circleClasses = classNames(css.circle, {
  });

  const circleStyle = {
    ...style,
    width: `${dim}px`,
    height: `${dim}px`,
    borderWidth: `${borderWidth}px`,
    lineHeight: `${dim - (borderWidth * 2)}px`,
  };

  return (
    <span ref={ref} className={circleClasses} style={circleStyle}>&nbsp;</span>
  );
  //                                                                                  </editor-fold>
};

Circle.displayName = 'Circle';


export { Circle };
