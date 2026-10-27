import PropTypes from 'prop-types';
import { memo } from 'react';

import Enums from 'assets/enums';
import classNames from 'utils/classNames';

import css from './shader.scss';


/**
 * Memorized React component of a shader used with the scoll bars to shade the border areas.
 */
const Shader = memo(({ pos, color }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


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

  const shaderClass = classNames(css.shader, css[pos.enumKey.toLowerCase()]);

  const shaderStyle = {
    background: `linear-gradient(to ${pos.enumKey.toLowerCase()}, transparent, ${color?.color ?? color})`,
  };

  return (
    <div className={shaderClass} style={shaderStyle} />
  );
  //                                                                                  </editor-fold>
});

Shader.displayName = 'Shader';

Shader.propTypes = {
  pos: PropTypes.instanceOf(Enums.Position).isRequired,
  color: PropTypes.oneOfType([PropTypes.instanceOf(Enums.BackgroundColor), PropTypes.string]),
};

Shader.defaultProps = {
  color: Enums.BackgroundColor.NONE,
};

export default Shader;
