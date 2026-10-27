import { createPortal } from 'react-dom';

import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';

import * as css from './dialog.scss';
import { type DialogProps, dialogStylingProps } from './dialog.types';


const portalCntr = document.getElementById(process.env['ELEM_ID_TEMP'] ?? '');


/**
 * React component of the popup component "Dialog", a universal dialog container. The dialog is
 * located in the temporary root by a React portal. It is always shown in the center of the screen.
 */
const Dialog = ({
  id, exclusive = false, dimmedBackground = false, children, ...restProps
}: DialogProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { elemStyle } = useStylingProps(restProps, dialogStylingProps, { addCombinedStyle: true });


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the synthetic React event "onWheel" of the native main element of the dialog.
   */
  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!portalCntr) {
    return null;
  }


  const screenClasses = classNames(css.screen, {
    [css.exclusive]: exclusive,
    [css.visible]: exclusive && dimmedBackground,
  });

  return createPortal(
    <div
      className={screenClasses}
      {...(exclusive && {
        onWheel: handleWheel,
      })}
    >
      <div
        {...(id && { id })}
        className={css.dialog}
        style={elemStyle}
      >
        {children}
      </div>
    </div>,
    portalCntr,
  );
  //                                                                                  </editor-fold>
};

Dialog.displayName = 'Dialog';


export { Dialog };
