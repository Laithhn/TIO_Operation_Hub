import PropTypes from 'prop-types';
import { memo } from 'react';

import WindowControlButton, { WindowControlButtonType } from 'frame/windowControlButton';
import { hooks } from 'store';

import css from './header.scss';


/**
 *
 */
const Header = memo(({
  title, onPointerDown, onMinimize, onClose,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = hooks.useI18n();


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

  return (
    <div
      className={css.header}
      {...(onPointerDown && { onPointerDown })}
    >
      <div className={css.title}>{translateText(title)}</div>
      <div className={css.buttons}>
        {onMinimize && (
          <WindowControlButton
            type={WindowControlButtonType.MINIMIZE}
            onClick={onMinimize}
          />
        )}
        {onClose && (
          <WindowControlButton
            type={WindowControlButtonType.CLOSE}
            onClick={onClose}
          />
        )}
      </div>
    </div>
  );
  //                                                                                  </editor-fold>
});

Header.displayName = 'Header';

Header.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onPointerDown: PropTypes.func,
  onMinimize: PropTypes.func,
  onClose: PropTypes.func,
};

Header.defaultProps = {
  title: '',
  onPointerDown: null,
  onMinimize: null,
  onClose: null,
};

export default Header;
