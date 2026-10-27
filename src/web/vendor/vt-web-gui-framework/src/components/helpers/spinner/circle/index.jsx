import PropTypes from 'prop-types';

import classNames from 'utils/classNames';

import css from './circle.scss';


/**
 * React component of a rotating circle spinner.
 */
const Circle = ({ dim, darkTheme, style }) => {
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
    [css.darkTheme]: darkTheme,
  });

  const circleStyle = {
    ...style,
    width: `${dim}px`,
    height: `${dim}px`,
    borderWidth: `${borderWidth}px`,
    lineHeight: `${dim - (borderWidth * 2)}px`,
  };

  return (
    <span className={circleClasses} style={circleStyle}>&nbsp;</span>
  );
  //                                                                                  </editor-fold>
};

Circle.displayName = 'Circle';

Circle.propTypes = {
  dim: PropTypes.number.isRequired,
  darkTheme: PropTypes.bool,
  style: PropTypes.object,
};

Circle.defaultProps = {
  darkTheme: false,
  style: {},
};

export default Circle;
