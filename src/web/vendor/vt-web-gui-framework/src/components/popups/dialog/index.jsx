import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';

import useStylingProps from 'components/hooks/useStylingProps';
import classNames from 'utils/classNames';

import css from './dialog.scss';
import stylingProps from './stylingProps';


/**
 * React component of a universal dialog container. The dialog is located in the temporary root by a
 * React portal. It is always shown in the center of the screen.
 */
const Dialog = ({
  exclusive, dimmedBackground, children, ...restProps
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { elemStyle } = useStylingProps(restProps, stylingProps, { addCombinedStyle: true });


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const disableEventBuddling = (event) => {
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

  const screenClasses = classNames(css.screen, {
    [css.exclusive]: exclusive,
    [css.visible]: exclusive && dimmedBackground,
  });

  return createPortal(
    <div
      className={screenClasses}
      {...(exclusive && {
        onWheel: disableEventBuddling,
      })}
    >
      <div className={css.dialog} style={elemStyle}>
        {children}
      </div>
    </div>,
    document.getElementById(process.env.ELEM_ID_TEMP),
  );
  //                                                                                  </editor-fold>
};

Dialog.displayName = 'Dialog';

Dialog.propTypes = {
  exclusive: PropTypes.bool,
  dimmedBackground: PropTypes.bool,
  children: PropTypes.node,
};

Dialog.defaultProps = {
  exclusive: false,
  dimmedBackground: false,
  children: null,
};

export default Dialog;
