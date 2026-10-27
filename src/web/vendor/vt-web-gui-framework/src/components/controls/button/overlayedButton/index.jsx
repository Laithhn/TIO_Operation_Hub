import PropTypes from 'prop-types';
import { forwardRef } from 'react';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import classNames from 'utils/classNames';

import css from './overlayedButton.scss';
import defines from '../defines';
import { ButtonState, ButtonHighlight } from '../enums';


/**
 * React component of an icon button. Note that the button is a span element due to a Google Chrome
 * bug (Issue 375693: Flexbox model does not work on fieldset elements).
 */
const OverlayedButton = forwardRef(({
  id, htmlId, left, right, top, bottom, style, interactionProps, runClickAnim, large, state, highlight, icon,
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
  const path = getIconPath(icon) || getIconPath(defines.overlayedButtons.defaultIcon);
  const modStyle = { ...style };

  if ((typeof left === 'number') && !Number.isNaN(left)) {
    modStyle.left = `${left}px`;
  } else if ((typeof right === 'number') && !Number.isNaN(right)) {
    modStyle.right = `${right}px`;
  } else {
    modStyle.left = 0;
  }

  if ((typeof top === 'number') && !Number.isNaN(top)) {
    modStyle.top = `${top}px`;
  } else if ((typeof bottom === 'number') && !Number.isNaN(bottom)) {
    modStyle.bottom = `${bottom}px`;
  } else {
    modStyle.top = 0;
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

  const overlayedButtonClasses = classNames(css.overlayedButton, {
    [css.large]: large,
    [css.disabled]: disabled,
    [css.highlightWeak]: (!disabled && (highlight === ButtonHighlight.WEAK)),
    [css.highlightAttention]: (!disabled && (highlight === ButtonHighlight.ATTENTION)),
    [css.highlightAttentionHigh]: (!disabled && (highlight === ButtonHighlight.ATTENTION_HIGH)),
    [css.runClickAnim]: runClickAnim,
  });

  return (
    <span
      {...((process.env.NODE_ENV === 'development') && { id: htmlId })}
      ref={ref}
      role="button"
      className={overlayedButtonClasses}
      style={modStyle}
      data-id={id}
      {...interactionProps}
    >
      {path && (
        <svg viewBox={viewbox}>
          <path d={path} />
        </svg>
      )}
    </span>
  );
  //                                                                                  </editor-fold>
});

OverlayedButton.displayName = 'OverlayedButton';

OverlayedButton.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  htmlId: PropTypes.string,
  left: PropTypes.number,
  right: PropTypes.number,
  top: PropTypes.number,
  bottom: PropTypes.number,
  style: PropTypes.object,
  interactionProps: PropTypes.object,
  runClickAnim: PropTypes.bool,
  large: PropTypes.bool,
  state: PropTypes.instanceOf(ButtonState),
  highlight: PropTypes.instanceOf(ButtonHighlight),
  icon: PropTypes.string,
};

OverlayedButton.defaultProps = {
  id: '',
  htmlId: null,
  left: null,
  right: null,
  top: null,
  bottom: null,
  style: {},
  interactionProps: {},
  runClickAnim: false,
  large: false,
  state: ButtonState.IDLE,
  highlight: ButtonHighlight.NONE,
  icon: '',
};

export default OverlayedButton;
