import { layout } from 'assets/styles';
import { Button, type ButtonProps } from 'components/controls/button';
import { useFadeInOut } from 'components/hooks/useFadeInOut';
import { classNames } from 'utils/classNames';

import * as css from './naviButton.scss';
import type { NaviButtonProps } from './naviButton.types';


/**
 * React sub-component "NaviButton" of the popup component "ImageViewer": the button that switches
 * to the image before or after the shown one. It floats over that side of the image and fades in
 * and out with the pointer, the strip around it doing nothing but placing it there.
 */
const NaviButton = ({
  pos, visible = false, isExpanded = false, onClick,
}: NaviButtonProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { visibility, style } = useFadeInOut({
    show: visible,
    fadeInTimeMs: layout.animationTime.slowMs,
    fadeOutTimeMs: layout.animationTime.slowMs,
  });


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the callback prop "onClick" of the button. The event stops here: the image behind
   * the button answers a click of its own, and a click meant for the navigation is not one meant
   * for it. The click counts only while the button is shown, the strip keeping its place through
   * the fade out.
   */
  const handleClickButton: NonNullable<ButtonProps['onClick']> = ({ event }) => {
    event.stopPropagation();

    if (visible) {
      onClick?.();
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (visibility === 'hide') {
    return null;
  }

  const naviButtonClasses = classNames(css.naviButton, {
    [css.left]: (pos === 'left'),
    [css.right]: (pos === 'right'),
    [css.isExpanded]: isExpanded,
  });

  return (
    <div className={naviButtonClasses} style={style}>
      <Button
        type="overlaid"
        large={!isExpanded}
        darkTheme
        icon={(pos === 'left') ? 'NAVILEFT' : 'NAVIRIGHT'}
        onClick={handleClickButton}
      />
    </div>
  );
  //                                                                                  </editor-fold>
};

NaviButton.displayName = 'NaviButton';


export { NaviButton };
