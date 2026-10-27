import PropTypes from 'prop-types';
import { forwardRef } from 'react';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import classNames from 'utils/classNames';

import css from './raisedButton.scss';
import defines from '../defines';
import { ButtonState, ButtonHighlight } from '../enums';


/**
 * React component of a raised button. Note that the button is a span element due to a Google Chrome
 * bug (Issue 375693: Flexbox model does not work on fieldset elements).
 */
const RaisedButton = forwardRef(({
  id, htmlId, style, interactionProps, runClickAnim, large, state, highlight, text, icon,
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { viewbox, iconExists, getIconPath } = useIconsAsync();

  const disabled = (state === ButtonState.DISABLED);

  const isIdle = (
    (state !== ButtonState.BUSY)
    && (state !== ButtonState.ACTIVE)
    && !disabled
  );

  const modHighlight = ((isIdle && (highlight instanceof ButtonHighlight))
    ? highlight
    : ButtonHighlight.NONE);

  const modText = (text !== '') ? text : defines.raisedButtons.defaultText;


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

  const raisedButtonOuterClasses = classNames(css.raisedButton, {
    [css.large]: large,
    [css.disabled]: disabled,
    [css.busy]: (state === ButtonState.BUSY),
    [css.active]: (state === ButtonState.ACTIVE),
    [css.highlightWeak]: (modHighlight === ButtonHighlight.WEAK),
    [css.highlightAttention]: (modHighlight === ButtonHighlight.ATTENTION),
    [css.highlightAttentionHigh]: (modHighlight === ButtonHighlight.ATTENTION_HIGH),
    [css.highlightSignalOk]: (modHighlight === ButtonHighlight.SIGNAL_OK),
    [css.highlightSignalWarning]: (modHighlight === ButtonHighlight.SIGNAL_WARNING),
    [css.highlightSignalError]: (modHighlight === ButtonHighlight.SIGNAL_ERROR),
    [css.runClickAnim]: runClickAnim,
  });


  return (
    <span
      {...((process.env.NODE_ENV === 'development') && { id: htmlId })}
      ref={ref}
      role="button"
      aria-pressed={state === ButtonState.ACTIVE ? 'true' : 'false'}
      className={raisedButtonOuterClasses}
      style={style}
      data-id={id}
      {...interactionProps}
    >
      {iconExists(icon) && (
        <svg viewBox={viewbox}>
          <path d={getIconPath(icon)} />
        </svg>
      )}
      <span className={css.text}>{modText}</span>
    </span>
  );
  //                                                                                  </editor-fold>
});

RaisedButton.displayName = 'RaisedButton';

RaisedButton.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  htmlId: PropTypes.string,
  style: PropTypes.object,
  interactionProps: PropTypes.object,
  runClickAnim: PropTypes.bool,
  large: PropTypes.bool,
  state: PropTypes.instanceOf(ButtonState),
  highlight: PropTypes.instanceOf(ButtonHighlight),
  text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  icon: PropTypes.string,
};

RaisedButton.defaultProps = {
  id: '',
  htmlId: null,
  style: {},
  interactionProps: {},
  runClickAnim: false,
  large: false,
  state: ButtonState.IDLE,
  highlight: ButtonHighlight.NONE,
  text: defines.raisedButtons.defaultText,
  icon: '',
};

export default RaisedButton;
