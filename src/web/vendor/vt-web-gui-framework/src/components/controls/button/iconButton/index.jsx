import PropTypes from 'prop-types';
import { forwardRef } from 'react';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import classNames from 'utils/classNames';

import css from './iconButton.scss';
import defines from '../defines';
import { ButtonState, ButtonHighlight } from '../enums';


/**
 * React component of an icon button. Note that the button is a span element due to a Google Chrome
 * bug (Issue 375693: Flexbox model does not work on fieldset elements).
 */
const IconButton = forwardRef(({
  id, htmlId, style, interactionProps, runClickAnim, large, state, highlight, darkTheme, icon,
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { viewbox, getIconPath } = useIconsAsync();

  const disabled = (state === ButtonState.DISABLED);
  const path = getIconPath(icon) || getIconPath(defines.iconButtons.defaultIcon);


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

  const iconButtonClasses = classNames(css.iconButton, {
    [css.large]: large,
    [css.disabled]: disabled,
    [css.highlightWeak]: (!disabled && (highlight === ButtonHighlight.WEAK)),
    [css.highlightAttention]: (!disabled && (highlight === ButtonHighlight.ATTENTION)),
    [css.highlightAttentionHigh]: (!disabled && (highlight === ButtonHighlight.ATTENTION_HIGH)),
    [css.darkTheme]: darkTheme,
    [css.runClickAnim]: runClickAnim,
  });

  return (
    <span
      {...((process.env.NODE_ENV === 'development') && { id: htmlId })}
      ref={ref}
      role="button"
      className={iconButtonClasses}
      style={style}
      data-id={id}
      {...interactionProps}
    >
      {path && (
        <svg viewBox={viewbox}>
          <path d={path} />
        </svg>
      )}
      <span>&nbsp;</span>
    </span>
  );
  //                                                                                  </editor-fold>
});

IconButton.displayName = 'IconButton';

IconButton.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  htmlId: PropTypes.string,
  style: PropTypes.object,
  interactionProps: PropTypes.object,
  runClickAnim: PropTypes.bool,
  large: PropTypes.bool,
  state: PropTypes.instanceOf(ButtonState),
  highlight: PropTypes.instanceOf(ButtonHighlight),
  darkTheme: PropTypes.bool, // flat and icon buttons only
  icon: PropTypes.string, // raised and icon buttons only
};

IconButton.defaultProps = {
  id: '',
  htmlId: null,
  style: {},
  interactionProps: {},
  runClickAnim: false,
  large: false,
  state: ButtonState.IDLE,
  highlight: ButtonHighlight.NONE,
  darkTheme: false,
  icon: '',
};

export default IconButton;
