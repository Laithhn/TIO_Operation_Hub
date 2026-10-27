import PropTypes from 'prop-types';


import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import useInteractions from 'components/hooks/useInteractions';
import { IconSize } from 'components/indicators/icon';
import classNames from 'utils/classNames';

import { WindowControlButtonType } from './enums';
import css from './windowControlButton.scss';


/**
 * React component of a window control button.
 */
const WindowControlButton = ({ type, onClick }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { viewbox, getIconPath } = useIconsAsync();

  const sizePx = IconSize.SMALL.valuePx;
  const path = getIconPath(type.icon) ?? getIconPath('WINDOW');


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const { interactionProps, runClickAnim } = useInteractions({
    enableClick: true,
    enableKeys: true,
    tabIndex: -1,
    onClick,
  });


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const windowControlButtonClasses = classNames(css.windowControlButton, {
    [css.runClickAnim]: runClickAnim,
  });

  return (
    <span
      role="button"
      className={windowControlButtonClasses}
      {...interactionProps}
    >
      {path && (
        <svg width={sizePx} height={sizePx} viewBox={viewbox}>
          <path d={path} />
        </svg>
      )}
    </span>
  );
  //                                                                                  </editor-fold>
};

WindowControlButton.displayName = 'WindowControlButton';

WindowControlButton.propTypes = {
  type: PropTypes.instanceOf(WindowControlButtonType).isRequired,
  onClick: PropTypes.func,
};

WindowControlButton.defaultProps = {
  onClick() {},
};

export { WindowControlButtonType };
export default WindowControlButton;
