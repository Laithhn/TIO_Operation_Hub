import {
  useState, useRef, useCallback, useEffect,
} from 'react';

import defines from 'assets/defines';


const holdDelayTimeMs = 400;
const defaultFunction = () => {};
const defaultKeys = ['Enter', ' '];


/**
 * @typedef {object} UseInteractionsValue
 * @porperty {object} interactionProps - Object with props for the element.
 * @property {boolean} interactionProps.aria-disabled - True of false, in dependence of option
 *   "disabled"
 * @property {number} interactionProps.tabIndex - The tab index, if given (see option "tabIndex")
 *   and if option disabled is "false".
 * @property {function} interactionProps.onFocus - Handler for synthetic React event, only if option
 *   disabled is "false", a tab index is given (see option "tabIndex") and option "enableFocus" is
 *   true.
 * @property {function} interactionProps.onBlur - Handler for synthetic React event, only if option
 *   disabled is "false", a tab index is given (see option "tabIndex") and option "enableFocus" is
 *   true.
 * @property {function} interactionProps.onPointerDown - Handler for synthetic React event, if
 *   option "disabled" is false and option "enableClick" is true.
 * @property {function} interactionProps.onPointerUp - Handler for synthetic React event, if option
 *   "disabled" is false and option "enableClick" is true.
 * @property {function} interactionProps.onMouseLeave - Handler for synthetic React event, if option
 *   "disabled" is false and option "enableClick" is true.
 * @property {function} interactionProps.onClick - Handler for synthetic React event, if option
 *   "disabled" is false and option "enableClick" is true.
 * @property {function} interactionProps.onTouchStart - Handler for synthetic React event, if option
 *   "disabled" is false and option "enableClick" is true.
 * @property {function} interactionProps.onTouchEnd - Handler for synthetic React event, if option
 *   "disabled" is false and option "enableClick" is true.
 * @property {function} interactionProps.onTouchMove - Handler for synthetic React event, if option
 *   "disabled" is false and option "enableClick" is true.
 * @property {function} interactionProps.onContextMenu - Handler for synthetic React event, if
 *   option "disabled" is false and option "enableClick" is true.
 * @property {function} interactionProps.onKeyDown - Handler for synthetic React event, if option
 *   "disabled" is false and option "enableKeys" is true.
 * @property {function} interactionProps.onKeyUp - Handler for synthetic React event, if option
 *   "disabled" is false and option "enableKeys" is true.
 * @property {boolean} runClickAnim - Is set to true at the beginning of a click for at least the
 *   time, defined in defines.layout.defaultAnimationTimeMs or at the latest at the end of the
 *   click.
 * @property {boolean} focus - Is set to true between the callings of onFocus and onBlur.
 * @property {boolean} hover - Is set to true between the callings of onMouseEnter and onMouseLeave.
 */

/**
 * React hook to handle user interactions like simple clicking and keyboard events at a given DOM
 * element. Also holdable clicks are possible with pointers and with keys. The events "onMouseEnter"
 * and "onMouseLeave" are always set, if not disabled.
 *
 * @param {object} options
 * @param {boolean} [options.enableClick=false] - Set to true, to add the synthetic React events
 *   "onPointerDown", "onPointerUp", "onClick", "onTouchStart", "onTouchEnd", "onTouchMove" and
 *   "onContextMenu" to the resulting props. In dependence on the option "holdable", either simple
 *   clicks or holdable clicks are possible by using a pointer (mouse, touch, etc.).
 * @param {boolean} [options.enableKeys=false] - Set to true, to add the synthetic React events
 *   "onKeyDown" and "onKeyUp" to the resulting props. If so, with the keys listet in option
 *   "keysForClick" simple or holdable clicks can be done with the keyboard, in dependence on option
 *   "holdable".
 * @param {boolean} [options.enableFocus=false] - Only available, if option tabIndex is set to a
 *   number. So set to true, to add the synthetic React events "onFocus" and "onBlur" to the
 *   resulting props and delegate them to the callback functions onFocusIn and onFocusOut.
 *   Additionaly it will result to the returned boolean value "focus".
 * @param {boolean} [options.disabled=false] - Set to true, to disable all events, set in this hook.
 *   Additinally this sets the attribute "aria-disabled" to the resulting props.
 * @param {boolean} [options.holdable=false] - Set to true, to enable the hold-meachanism of the
 *   pointers and keys.
 * @param {number} [options.pointerButtonMask=0b11111] - Possibility to mask out pointer buttons
 *   from the pointer event by setting to 0: (1st bit: primary button, 2nd bit: secondary button,
 *   3rd bit: auxiliary button, 4th and 5th bit: 4th and 5th button). This is only relevant for the
 *   delegation of the events "onPointerDown" and "onPointerUp" to the options "onPointerDown" and
 *   "onPointerUp".
 * @param {string[]} [options.keysForClick=['Enter', ' ']] - Memoized list of keys, that will used
 *   for keys to click. Option "enableKeys" must be set to true for this. Set "keysForClick" to
 *   null, to deactivate it.
 * @param {number} [options.tabIndex=null] - Set to a number to enable tabbing the element, if not
 *   disabled. The attribute "tabIndex" is set to the resulting props. This will also enable the
 *   focus mechanism (see options "enableFocus", "onFocusIn" and "onFocusOut").
 * @param {function} [options.onClick] - Memoized function that is called at simple clicks at the
 *   click event (preconditions: option "enableClick" is true, option "disabled" is false and option
 *   "holdable" is false) and at the key up event (preconditions: option "enableKeys" is true,
 *   option "disabled" is false, option "holdable" is false and the key must be listed in option
 *   "keysForClick"). It is also called at holdable clicks at the pointer down event with the main
 *   button (preconditions: option "enableClick" is true, option "disabled" is false and option
 *   "holdable" is true) and at the key down event (preconditions: option "enableKeys" is true,
 *   option "disabled" is false, option "holdable" is true and the key must be listed in option
 *   "keysForClick"). The event object is returned.
 * @param {function} [options.onHoldStart] - Memoized function that is called only at holdable
 *   clicks at the pointer down event with the main button (after delay time). Preconditions: option
 *   "enableClick" is true, option "disabled" is false and option "holdable" is true. It is also
 *   called at holdable clicks at the key down event (after delay time) with this preconditions:
 *   option "enableKeys" is true, option "disabled" is false, option "holdable" is true and the key
 *   must be listed in option "keysForClick". The event object is returned.
 * @param {function} [options.onHoldEnd] - Memoized function that is called only at holdable clicks
 *   at the click event. Preconditions: option "enableClick" is true, option "disabled" is false and
 *   option "holdable" is true. It is also called at holdable clicks at the key up event with this
 *   preconditions: option "enableKeys" is true, option "disabled" is false, option "holdable" is
 *   true and the key must be listed in option "keysForClick". The event object is returned.
 * @param {function} [options.onPointerDown] - Memoized function that is called at pointer down
 *   event. Preconditions: option "enableClick" is true, option "disabled" is false and the button
 *   must be masked in option "pointerButtonMask". The event object is returned.
 * @param {function} [options.onPointerUp] - Memoized function that is called at pointer up event.
 *   Preconditions: option "enableClick" is true, option "disabled" is false and the button must be
 *   masked in option "pointerButtonMask". The event object is returned.
 * @param {function} [options.onKey] - Memoized function that is called at key down event.
 *   Preconditions: option "enableKeys" is true and option "disabled" is false. The event object is
 *   returned.
 * @param {function} [options.onFocusIn] - Memoized function that is called at the focus event.
 *   Preconditions: option "enableFocus" is true, option "disabled" is false and option "tabIndex"
 *   is set to a number. The event object is returned.
 * @param {function} [options.onFocusOut] - Memoized function that is called at the blur event.
 *   Preconditions: option "enableFocus" is true, option "disabled" is false and option "tabIndex"
 *   is set to a number. The event object is returned.
 * @returns {UseInteractionsValue}
 */
const useInteractions = ({
  enableClick = false,
  enableKeys = false,
  enableFocus = false,
  disabled = false,
  holdable = false,
  pointerButtonMask = 0b11111,
  keysForClick = defaultKeys,
  tabIndex = null,
  onClick = defaultFunction,
  onHoldStart = defaultFunction,
  onHoldEnd = defaultFunction,
  onPointerDown = defaultFunction,
  onPointerUp = defaultFunction,
  onKey = defaultFunction,
  onFocusIn = defaultFunction,
  onFocusOut = defaultFunction,
} = {
  enableClick: false,
  enableKeys: false,
  enableFocus: false,
  disabled: false,
  holdable: false,
  pointerButtonMask: 0b11111,
  keysForClick: defaultKeys,
  tabIndex: null,
  onClick: defaultFunction,
  onHoldStart: defaultFunction,
  onHoldEnd: defaultFunction,
  onPointerDown: defaultFunction,
  onPointerUp: defaultFunction,
  onKey: defaultFunction,
  onFocusIn: defaultFunction,
  onFocusOut: defaultFunction,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [runClickAnim, setRunClickAnim] = useState(false);
  const [focus, setFocus] = useState(false);
  const [hover, setHover] = useState(false);

  const isPressedRef = useRef(false); // is true between pointer down and pointer up
  const isHoldRef = useRef(false); // is true during the holding phase of holdable buttons
  const clickAnimTimerRef = useRef(0);
  const clickAnimTimerIsRunningRef = useRef(false);
  const holdDelayTimerRef = useRef(0);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * The state machine for the click animation, results in state "runClickAnim" to show a click
   * animation by CSS. The click animation has a minimum animation time, realized by a timeout.
   *
   * @param {string} cmd - The state machine command: "START", "STOP" or "CANCEL".
   */
  const clickAnimation = useCallback((cmd) => {
    switch (cmd) {
      // -------------------------------------------------------------------------------------------
      case 'START':
      // -------------------------------------------------------------------------------------------

        isPressedRef.current = true;

        // always restart the click animation timer
        clearTimeout(clickAnimTimerRef.current);
        clickAnimTimerIsRunningRef.current = true;

        clickAnimTimerRef.current = setTimeout(() => {
          clickAnimTimerIsRunningRef.current = false;

          // stop the click animation after timeout, if the butten is not pressed any longer
          if (!isPressedRef.current) {
            setRunClickAnim(false);
          }
        }, defines.layout.defaultAnimationTimeMs);

        // start the click animation
        setRunClickAnim(true);
        break;

      // -------------------------------------------------------------------------------------------
      case 'STOP':
      // -------------------------------------------------------------------------------------------

        isPressedRef.current = false;

        // stop the click animation, if the animation timer is not running anymore
        if (!clickAnimTimerIsRunningRef.current) {
          setRunClickAnim(false);
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'CANCEL':
      // -------------------------------------------------------------------------------------------

        isPressedRef.current = false;

        clearTimeout(clickAnimTimerRef.current);
        clickAnimTimerIsRunningRef.current = false;
        setRunClickAnim(false);
        break;

      // no default
    }
  }, []);


  /**
   * Helper function to start a holdable click.
   */
  const startHoldableClick = useCallback((event) => {
    onClick(event);

    isHoldRef.current = false;
    clearTimeout(holdDelayTimerRef.current);

    holdDelayTimerRef.current = setTimeout(() => {
      // if the button is still pressed, call onHoldStart() after the hold delay time
      if (isPressedRef.current) {
        onHoldStart(event);
        isHoldRef.current = true;
      }
    }, holdDelayTimeMs);
  }, [onClick, onHoldStart]);


  /**
   * Helper function to stop a holdable click, started after the hold delay time before.
   */
  const stopHoldableClick = useCallback((event) => {
    if (isHoldRef.current) {
      onHoldEnd(event);
      isHoldRef.current = false;
    }
  }, [onHoldEnd]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Memoized handler for synthetic React event "onPointerDown" on the element. The default
   * behaviour of the event is prevented in order to disable the text selection. This event is
   * always fired (mouse, touch, etc.) at the beginning of a click.
   */
  const handlePointerDown = useCallback((event) => {
    event.preventDefault();

    // for every button that is in the button mask...
    if ((1 << event.button) & pointerButtonMask) {
      onPointerDown(event);
    }

    // only for the main button...
    if (event.button === 0) {
      clickAnimation('START');

      if (holdable) {
        startHoldableClick(event);
      }
    }
  }, [holdable, pointerButtonMask, onPointerDown, clickAnimation, startHoldableClick]);


  /**
   * Memoized handler for synthetic React event "handlePointerUp" on the element. Using a mouse,
   * this event is only fired if the mouse is not moved out of the element between pointer down and
   * pointer up. At touch, this event is also fired outside of the element.
   */
  const handlePointerUp = useCallback((event) => {
    // for every button that is in the button mask...
    if ((1 << event.button) & pointerButtonMask) {
      onPointerUp(event);
    }

    clickAnimation('STOP');

    // only for the main button...
    if ((event.button === 0) && holdable) {
      stopHoldableClick(event);
    }
  }, [holdable, pointerButtonMask, onPointerUp, clickAnimation, stopHoldableClick]);


  /**
   * Memoized handler for synthetic React event "onMouseEnter" on the element.
   */
  const handleMouseEnter = useCallback(() => {
    setHover(true);
  }, []);


  /**
   * Memoized handler for synthetic React event "onMouseLeave" on the element. This event is used to
   * cancel the animation and stop a holdable click, if the mouse is moved out of the element
   * between pointer down and pointer up.
   */
  const handleMouseLeave = useCallback((event) => {
    setHover(false);

    if (enableClick) {
      clickAnimation('CANCEL');

      if (holdable) {
        stopHoldableClick(event);
      }
    }
  }, [enableClick, holdable, clickAnimation, stopHoldableClick]);


  /**
   * Memoized handler for synthetic React event "onClick" on the element to handle the simple
   * clicks. This event is only fired, if the pointer (mouse, touch, etc.) is inside the element.
   */
  const handleClick = useCallback((event) => {
    if (!holdable) {
      onClick(event);
    }
  }, [holdable, onClick]);


  /**
   * Memoized handler for synthetic React touch events to stop the propagation of all of them. This
   * is importent to prevent touch scrolling of the underlying elements.
   */
  const handleStopPropagation = useCallback((event) => {
    event.stopPropagation();
  }, []);


  /**
   * Memoized handler for synthetic React event "onContextMenu" on the element. The default
   * behaviour, showing the context menu of the browser, is prevented at holdable clicks (important
   * for touch).
   */
  const handleContextMenu = useCallback((event) => {
    if (holdable) {
      event.preventDefault();
    }
  }, [holdable]);


  /**
   * Memoized handler for synthetic React event "onKeyDown" on the element.
   */
  const handleKeyDown = useCallback((event) => {
    // Only if not yet pressed, because onKeyDown is fired multile times if it is hold down. And
    // only if the key is listed in option "keysForClick"...
    if (!isPressedRef.current && Array.isArray(keysForClick) && keysForClick.includes(event.key)) {
      clickAnimation('START');

      if (holdable) {
        startHoldableClick(event);
      }
    }

    // on every key down...
    onKey(event);
  }, [holdable, keysForClick, onKey, clickAnimation, startHoldableClick]);


  /**
   * Memoized handler for synthetic React event "onKeyUp" on the element.
   */
  const handleKeyUp = useCallback((event) => {
    if (Array.isArray(keysForClick) && keysForClick.includes(event.key)) {
      if (!holdable) {
        // prevent key up events without key down events, happened before
        if (isPressedRef.current) {
          onClick(event);
        }
      } else {
        stopHoldableClick(event);
      }

      clickAnimation('STOP');
    }
  }, [holdable, keysForClick, onClick, clickAnimation, stopHoldableClick]);


  /**
   * Memoized handler for synthetic React event "onFocus" on the element.
   */
  const handleFocus = useCallback((event) => {
    setFocus(true);
    onFocusIn(event);
  }, [onFocusIn]);


  /**
   * Memoized handler for synthetic React event "onBlur" on the element.
   */
  const handleBlur = useCallback((event) => {
    setFocus(false);
    onFocusOut(event);
  }, [onFocusOut]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (disabled) {
      // if the state of the element switched to disabled and if it is pressed at the moment, then
      // abort the click
      if (isPressedRef.current) {
        clickAnimation('CANCEL');

        if (holdable) {
          stopHoldableClick({});
        }
      }

      // also reset the focus flag back to false
      setFocus(false);
    }
  }, [disabled, holdable, clickAnimation, stopHoldableClick]);


  // Effect that clears the click animation timer at unmount.
  useEffect(() => () => {
    clearTimeout(clickAnimTimerRef.current);
    clearTimeout(holdDelayTimerRef.current);
  }, []);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return {
    interactionProps: {
      'aria-disabled': disabled,
      ...(!disabled && {
        ...((typeof tabIndex === 'number') && {
          tabIndex,
          ...(enableFocus && {
            onFocus: handleFocus,
            onBlur: handleBlur,
          }),
        }),
        ...(enableClick && {
          onPointerDown: handlePointerDown,
          onPointerUp: handlePointerUp,
          onClick: handleClick,
          onTouchStart: handleStopPropagation,
          onTouchEnd: handleStopPropagation,
          onTouchMove: handleStopPropagation,
          onContextMenu: handleContextMenu,
        }),
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        ...(enableKeys && {
          onKeyDown: handleKeyDown,
          onKeyUp: handleKeyUp,
        }),
      }),
    },
    runClickAnim,
    focus,
    hover,
  };
  //                                                                                  </editor-fold>
};

export default useInteractions;
