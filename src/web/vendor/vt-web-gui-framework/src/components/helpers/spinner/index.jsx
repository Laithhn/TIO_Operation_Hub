import PropTypes from 'prop-types';
import { memo } from 'react';

import defines from 'assets/defines';
import useStylingProps from 'components/hooks/useStylingProps';

import Bars from './bars';
import Circle from './circle';
import { SpinnerType } from './enums';
import stylingProps from './stylingProps';


const DIM_MIN = 16;
const DIM_MAX = defines.space.xxl;


/**
 * Memoized React component of an animated loading spinner with selectable appearance (type) and
 * dimension.
 */
const Spinner = memo(({
  type, dim, darkTheme, ...restProps
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, stylingProps);

  const normDim = Math.round(Math.max(DIM_MIN, Math.min(DIM_MAX, dim)));


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

  if (type === SpinnerType.BARS) {
    return (
      <Bars dim={normDim} darkTheme={darkTheme} style={outerElemStyle} />
    );
  }

  return (
    <Circle dim={normDim} darkTheme={darkTheme} style={outerElemStyle} />
  );
  //                                                                                  </editor-fold>
});

Spinner.displayName = 'Spinner';

Spinner.propTypes = {
  type: PropTypes.instanceOf(SpinnerType),
  dim: PropTypes.number,
  darkTheme: PropTypes.bool,
};

Spinner.defaultProps = {
  type: SpinnerType.CIRCLE,
  dim: defines.space.xl,
  darkTheme: false,
};

export { SpinnerType };
export default Spinner;
