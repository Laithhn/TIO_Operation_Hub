import { classNames } from 'utils/classNames';

import * as css from './shader.scss';
import type { ShaderProps } from './shader.types';


/**
 * React sub-component of the helper component "Scrolling" to shade the border areas.
 */
const Shader = ({ pos, color }: ShaderProps) => {
  //                                                                                  </editor-fold>
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

  const shaderClasses = classNames(css.shader, css[pos]);

  const shaderStyle = {
    background: `linear-gradient(to ${pos}, transparent, ${color})`,
  };

  return (
    <div className={shaderClasses} style={shaderStyle} />
  );
  //                                                                                  </editor-fold>
};

Shader.displayName = 'Shader';


export { Shader };
