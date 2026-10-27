import PropTypes from 'prop-types';
import { forwardRef } from 'react';

import classNames from 'utils/classNames';

import css from './flatButton.scss';
import defines from '../defines';
import { ButtonState, ButtonHighlight } from '../enums';


/**
 * React component of a flat button using ppHOC withButton. Note that the button is a span element
 * due to a Google Chrome bug (Issue 375693: Flexbox model does not work on fieldset elements).
 */
const FlatButton = forwardRef(({
  id, htmlId, style, interactionProps, runClickAnim, state, highlight, darkTheme, text,
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const disabled = (state === ButtonState.DISABLED);
  const modText = (text !== '') ? text : defines.flatButtons.defaultText;


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

  const flatButtonClasses = classNames(css.flatButton, {
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
      className={flatButtonClasses}
      style={style}
      data-id={id}
      {...interactionProps}
    >
      {modText}
    </span>
  );
  //                                                                                  </editor-fold>
});

FlatButton.displayName = 'FlatButton';

FlatButton.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  htmlId: PropTypes.string,
  style: PropTypes.object,
  interactionProps: PropTypes.object,
  runClickAnim: PropTypes.bool,
  state: PropTypes.instanceOf(ButtonState),
  highlight: PropTypes.instanceOf(ButtonHighlight),
  darkTheme: PropTypes.bool,
  text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

FlatButton.defaultProps = {
  id: '',
  htmlId: null,
  style: {},
  interactionProps: {},
  runClickAnim: false,
  state: ButtonState.IDLE,
  highlight: ButtonHighlight.NONE,
  darkTheme: false,
  text: '',
};

export default FlatButton;
