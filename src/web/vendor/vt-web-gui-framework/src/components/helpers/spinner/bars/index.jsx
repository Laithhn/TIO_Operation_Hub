import PropTypes from 'prop-types';

import classNames from 'utils/classNames';

import css from './bars.scss';


/**
 * React component of a pulsing bars spinner.
 */
const Bars = ({ dim, darkTheme, style }) => {
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
    [css.darkTheme]: darkTheme,
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
    <span className={css.bars} style={barsStyle}>
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

Bars.propTypes = {
  dim: PropTypes.number.isRequired,
  darkTheme: PropTypes.bool,
  style: PropTypes.object,
};

Bars.defaultProps = {
  darkTheme: false,
  style: {},
};

export default Bars;
