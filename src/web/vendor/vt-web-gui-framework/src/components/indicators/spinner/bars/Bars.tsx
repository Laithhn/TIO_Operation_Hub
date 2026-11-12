import { classNames } from 'utils/classNames';

import * as css from './bars.scss';
import type { BarsProps } from './bars.types';


/**
 * React sub-component of a pulsing bars spinner of the indicator component "Spinner".
 */
const Bars = ({
  ref, dim, style,
}: BarsProps) => {
  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const gap = Math.ceil(dim / 20); // at least 5% gap between the bars
  const barWidth = Math.floor((dim - (gap * 4)) / 5); // the width of the bars


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

  const barsStyle = {
    ...style,
    width: `${dim}px`,
  };

  const innerContrClasses = classNames(css.innerContr, {
  });

  const barStyle = {
    width: `${barWidth}px`,
  };

  const textStyle = {
    width: `${dim / 2}px`,
    marginLeft: `-${dim / 2}px`,
    lineHeight: `${dim}px`,
  };

  return (
    <span ref={ref} className={css.bars} style={barsStyle}>
      <span className={innerContrClasses}>
        <span style={barStyle} />
        <span style={barStyle} />
        <span style={barStyle} />
        <span style={barStyle} />
        <span style={barStyle} />
      </span>
      <span className={css.text} style={textStyle}>&nbsp;</span>
    </span>
  );
  //                                                                                  </editor-fold>
};

Bars.displayName = 'Bars';


export { Bars };
