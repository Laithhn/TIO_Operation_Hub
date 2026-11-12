import type { GroundStyle } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';

import * as css from './shader.scss';
import type { ShaderProps } from './shader.types';


/**
 * React sub-component of the helper component "ScrollButton" to wrap the scroll button
 * given as child with a visible or invisible shader field.
 */
const Shader = ({
  dir, show, isRtl, showShader, backgroundColor, ground, children,
}: ShaderProps) => {
  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let background;

  if (showShader && backgroundColor) {
    switch (dir) {
      case 'up': background = `linear-gradient(to bottom, ${backgroundColor}, transparent)`; break;
      case 'down': background = `linear-gradient(to top, ${backgroundColor}, transparent)`; break;
      case 'left': background = `linear-gradient(to ${isRtl ? 'left' : 'right'}, ${backgroundColor}, transparent)`; break;
      case 'right': background = `linear-gradient(to ${isRtl ? 'right' : 'left'}, ${backgroundColor}, transparent)`; break;
      // no default
    }
  }


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

  const shaderClasses = classNames(css.shader, {
    [css.show]: show,
    [css.posTop]: (dir === 'up'),
    [css.posBottom]: (dir === 'down'),
    [css.posLeft]: (dir === 'left'),
    [css.posRight]: (dir === 'right'),
  });

  // A painted shader is the ground the arrow sits on, so it sets the ground of its colour; an
  // unpainted one leaves the arrow on the ground of the container it scrolls.
  const shaderStyle: GroundStyle = {
    background,
    ...(background && ground && { '--ground': ground }),
  };

  return (
    <div className={shaderClasses} style={shaderStyle}>{children}</div>
  );
  //                                                                                  </editor-fold>
};

Shader.displayName = 'Shader';


export { Shader };
