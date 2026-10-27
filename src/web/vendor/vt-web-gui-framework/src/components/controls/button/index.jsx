import PropTypes from 'prop-types';
import {
  memo, forwardRef, useRef, useImperativeHandle, useCallback,
} from 'react';

import useInteractions from 'components/hooks/useInteractions';
import useStylingProps from 'components/hooks/useStylingProps';

import FlatButton from './flatButton';
import IconButton from './iconButton';
import OverlayedButton from './overlayedButton';
import RaisedButton from './raisedButton';
import buttonDefines from './defines';
import {
  ButtonType, ButtonState, ButtonHighlight,
} from './enums';
import stylingProps from './stylingProps';


/**
 * Memoized React component of buttons which can be used everywhere in VtWebGuiFramework, placed
 * inline or inside a CSS grid. It can appear in three forms:
 * - as raised button with text and an optional icon, can be active and busy, two sizes,
 * - as flat button, only with text
 * - as icon button, only with an icon, two sizes.
 * - as overlayed button above the content, only with an icon, two sizes.
 * A button can also be holdable: function prop "onClick" is called immediately at pointer down. If
 * the button is kept pressed for a certain period of delay time, function prop "onHoldStart" is
 * called. When the button is released again afterwards, function prop "onHoldEnd" is called. If the
 * button is not used as holdable, function prop "onClick" is called at pointer up.
 */
const Button = memo(forwardRef(({
  id, htmlId, type, left, right, top, bottom, large, state, holdable, highlight, darkTheme, text,
  icon, onClick, onHoldStart, onHoldEnd, ...restProps
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const buttonRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, stylingProps);
  let noInteraction;

  if (type === ButtonType.RAISED) {
    noInteraction = (
      (state === ButtonState.BUSY)
      || (state === ButtonState.ACTIVE)
      || (state === ButtonState.DISABLED)
    );
  } else {
    noInteraction = (state === ButtonState.DISABLED);
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    focus: () => {
      requestAnimationFrame(() => {
        if (buttonRef?.current) {
          buttonRef.current.focus();
        }
      });
    },
    blur: () => {
      requestAnimationFrame(() => {
        if (buttonRef?.current) {
          buttonRef.current.blur();
        }
      });
    },
    getBoundingClientRect: () => (
      buttonRef?.current && buttonRef.current.getBoundingClientRect()
    ),
  }), []);


  const { interactionProps, runClickAnim } = useInteractions({
    enableClick: true,
    enableKeys: true,
    disabled: noInteraction,
    holdable,
    tabIndex: 0,
    onClick: useCallback((event) => {
      if (event.type.startsWith('pointer')) {
        document.activeElement.blur();
      }

      onClick(id, event);
    }, [id, onClick]),
    onHoldStart: useCallback((event) => { onHoldStart(id, event); }, [id, onHoldStart]),
    onHoldEnd: useCallback((event) => { onHoldEnd(id, event); }, [id, onHoldEnd]),
    onKey: useCallback((event) => {
      if (event.key === 'Escape') {
        document.activeElement?.blur();
      }
    }, []),
  });


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------


  // -----------------------------------------------------------------------------------------------
  if (type === ButtonType.FLAT) { // return a flat button
  // -----------------------------------------------------------------------------------------------

    return (
      <FlatButton
        ref={buttonRef}
        id={id}
        htmlId={htmlId}
        style={outerElemStyle}
        interactionProps={interactionProps}
        runClickAnim={runClickAnim}
        state={state}
        highlight={highlight}
        darkTheme={darkTheme}
        text={text}
      />
    );
  }

  // -----------------------------------------------------------------------------------------------
  if (type === ButtonType.ICON) { // return an icon button
  // -----------------------------------------------------------------------------------------------

    return (
      <IconButton
        ref={buttonRef}
        id={id}
        htmlId={htmlId}
        style={outerElemStyle}
        interactionProps={interactionProps}
        runClickAnim={runClickAnim}
        large={large}
        state={state}
        highlight={highlight}
        darkTheme={darkTheme}
        icon={icon}
      />
    );
  }

  // -----------------------------------------------------------------------------------------------
  if (type === ButtonType.OVERLAYED) { // return an overlayed button
  // -----------------------------------------------------------------------------------------------

    return (
      <OverlayedButton
        ref={buttonRef}
        id={id}
        htmlId={htmlId}
        left={left}
        right={right}
        top={top}
        bottom={bottom}
        style={outerElemStyle}
        interactionProps={interactionProps}
        runClickAnim={runClickAnim}
        large={large}
        state={state}
        highlight={highlight}
        icon={icon}
      />
    );
  }

  // -----------------------------------------------------------------------------------------------
  // return a raised button
  // -----------------------------------------------------------------------------------------------

  return (
    <RaisedButton
      ref={buttonRef}
      id={id}
      htmlId={htmlId}
      style={outerElemStyle}
      interactionProps={interactionProps}
      runClickAnim={runClickAnim}
      large={large}
      state={state}
      highlight={highlight}
      text={text}
      icon={icon}
    />
  );
  //                                                                                  </editor-fold>
}));

Button.displayName = 'Button';

Button.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  htmlId: PropTypes.string,
  type: PropTypes.instanceOf(ButtonType),
  left: PropTypes.number,
  right: PropTypes.number,
  top: PropTypes.number,
  bottom: PropTypes.number,
  large: PropTypes.bool,
  state: PropTypes.instanceOf(ButtonState),
  holdable: PropTypes.bool,
  highlight: PropTypes.instanceOf(ButtonHighlight),
  darkTheme: PropTypes.bool,
  text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  icon: PropTypes.string,
  onClick: PropTypes.func,
  onHoldStart: PropTypes.func,
  onHoldEnd: PropTypes.func,
};

Button.defaultProps = {
  id: '',
  htmlId: null,
  type: ButtonType.RAISED,
  left: null,
  right: null,
  top: null,
  bottom: null,
  large: false,
  state: ButtonState.IDLE,
  holdable: false,
  highlight: ButtonHighlight.NONE,
  darkTheme: false,
  text: '',
  icon: '',
  onClick() {},
  onHoldStart() {},
  onHoldEnd() {},
};

export {
  ButtonType, ButtonState, ButtonHighlight, buttonDefines,
};
export default Button;
