import { color, getGround, type Ground } from 'assets/styles';
import { useFadeInOut } from 'components/hooks/useFadeInOut';
import { useI18n } from 'components/hooks/useI18n';

import { ArrowButton } from './arrowButton/ArrowButton';
import { type ScrollButtonProps } from './scrollButton.types';
import { Shader } from './shader/Shader';


/**
 * React component of the helper component "ScrollButton". It displays a navigation field with
 * button and optional shader at the top, bottom, left or right position of a ralatively or
 * absolutely positioned container.
 */
const ScrollButton = ({
  dir, pos = 'start', show = false, showShader = false, shaderColor,
  holdable = false, disable = false, onClick,
}: ScrollButtonProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = useI18n();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let realShaderColor,
    shaderGround: Ground | undefined;

  // Only a colour of the palette states its ground; any other colour value leaves the ground to the
  // container.
  if (shaderColor && Object.hasOwn(color, shaderColor)) {
    realShaderColor = color[shaderColor as keyof typeof color];
    shaderGround = getGround(shaderColor as keyof typeof color);
  } else {
    realShaderColor = shaderColor as string | undefined;
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

  const { visibility } = useFadeInOut({ show });


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (visibility === 'hide') {
    return null;
  }


  return (
    <Shader
      dir={dir}
      show={(visibility === 'fadeIn') || (visibility === 'show')}
      isRtl={isRtl}
      showShader={showShader}
      backgroundColor={realShaderColor}
      ground={shaderGround}
    >
      <ArrowButton
        dir={dir}
        pos={pos}
        isRtl={isRtl}
        holdable={holdable}
        disable={disable}
        onClick={onClick}
      />
    </Shader>
  );
  //                                                                                  </editor-fold>
};

ScrollButton.displayName = 'ScrollButton';


export { ScrollButton };
