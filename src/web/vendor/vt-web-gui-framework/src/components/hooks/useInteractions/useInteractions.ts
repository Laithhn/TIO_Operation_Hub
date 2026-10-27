import { useEffect, useRef, useState } from 'react';

import { isNumber } from 'utils/type';

import type { UseInteractionsProps, UseInteractionsResult } from './useInteractions.types';


const holdDelayTimeMs = 400;
const defaultKeys = ['Enter', ' '];


/**
 * React hook "useInteractions" to handle user interactions like simple clicking and keyboard events
 * at a given HTML element. Also holdable clicks are possible with pointers and with keys. The
 * events "onMouseEnter" and "onMouseLeave" are always set, if not disabled.
 */
export const useInteractions = <E = Element>({
  enablePointer = false, enableKeyboard = false, enableFocus = false, disableAllEvents = false,
  enableTouchPropagation = false, holdable = false, pointerButtonMask = 0b11111,
  keysForClick = defaultKeys, tabIndex,
  onFocusIn, onFocusOut, onClick, onPointerDown, onPointerUp, onHoldStart, onHoldEnd, onKey,
}: UseInteractionsProps<E>): UseInteractionsResult<E> => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const elementFocusRef = useRef<EventTarget>(undefined);
  const elementPointerDownRef = useRef<EventTarget>(undefined);
  const elementMouseEnterRef = useRef<EventTarget>(undefined);
  const elementKeyDownRef = useRef<EventTarget>(undefined);

  const isPressedRef = useRef(false); // is true between pointer down and pointer up
  const isHoldRef = useRef(false); // is true during the holding phase of holdable buttons
  const holdDelayTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const modTabIndex = (!disableAllEvents && isNumber(tabIndex, { withoutInfinite: true, gte: 0 })) ? tabIndex : -1;
  const isFocusEnabled = !disableAllEvents && (modTabIndex >= 0) && enableFocus;
  const isPointerEnabled = !disableAllEvents && enablePointer;
  const isMouseEnabled = !disableAllEvents;
  const isKeyboardEnabled = !disableAllEvents && enableKeyboard;

  const prevsRef = useRef({
    isFocusEnabled, isPointerEnabled, isMouseEnabled, isKeyboardEnabled,
  });


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to set the pressed status, which lasts exactly as long as the pointer or the key
   * is held down. It needs no minimum duration: the stylesheet of the element takes the pressed
   * appearance on instantly and eases it out afterwards, so a press of a single rendered frame is
   * perceptible without being held in JavaScript. Kept in a ref as well, because the delay timer of
   * a holdable click and the repeating key down events read it synchronously.
   */
  const setPressed = (isPressedNow: boolean) => {
    isPressedRef.current = isPressedNow;
    setIsPressed(isPressedNow);
  };


  /**
   * Helper function to start a holdable click.
   */
  const startHoldableClick = (event: React.PointerEvent<E> | React.KeyboardEvent<E>) => {
    onClick?.(event);

    isHoldRef.current = false;
    clearTimeout(holdDelayTimerRef.current);

    holdDelayTimerRef.current = setTimeout(() => {
      // if the button is still pressed, call onHoldStart() after the hold delay time
      if (isPressedRef.current) {
        onHoldStart?.(event);
        isHoldRef.current = true;
      }
    }, holdDelayTimeMs);
  };


  /**
   * Helper function to stop a holdable click, started after the hold delay time before.
   */
  const stopHoldableClick = (event: React.PointerEvent<E> | React.MouseEvent<E> | React.KeyboardEvent<E>) => {
    if (isHoldRef.current) {
      onHoldEnd?.(event);
      isHoldRef.current = false;
    }
  };


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the synthetic React event "onFocus" of the element, this hook is used for.
   */
  const handleFocus: React.FocusEventHandler<E> = (event): void => {
    elementFocusRef.current = event.target;
    setIsFocused(true);
    onFocusIn?.(event);
  };


  /**
   * Handler for the synthetic React event "onBlur" of the element, this hook is used for.
   */
  const handleBlur: React.FocusEventHandler<E> = (event): void => {
    elementFocusRef.current = undefined;
    setIsFocused(false);
    onFocusOut?.(event);
  };


  /**
   * Handler for the synthetic React event "onClick" of the element, this hook is used for.
   */
  const handleClick: React.MouseEventHandler<E> = (event): void => {
    if (!holdable) {
      onClick?.(event);
    }
  };


  /**
   * Handler for the synthetic React event "onPointerDown" of the element, this hook is used for.
   * The default behaviour of the event is prevented in order to disable the text selection.
   */
  const handlePointerDown: React.PointerEventHandler<E> = (event): void => {
    event.preventDefault();
    elementPointerDownRef.current = event.target;

    // Only for the button that are listed in the button mask...
    if ((1 << event.button) & pointerButtonMask) {
      onPointerDown?.(event);
    }

    // Only for the main button...
    if (event.button === 0) {
      setPressed(true);

      if (holdable) {
        startHoldableClick(event);
      }
    }
  };


  /**
   * Handler for the synthetic React event "onPointerUp" of the element, this hook is used for.
   */
  const handlePointerUp: React.PointerEventHandler<E> = (event): void => {
    elementPointerDownRef.current = undefined;

    // Only for the button that are listed in the button mask...
    if ((1 << event.button) & pointerButtonMask) {
      onPointerUp?.(event);
    }

    setPressed(false);

    // Only for the main button...
    if ((event.button === 0) && holdable) {
      stopHoldableClick(event);
    }
  };


  /**
   * Handler for the synthetic React event "onPointerCancel" of the element, this hook is used for.
   * The browser cancels a pointer it takes over, above all a touch that turns into a pan. No pointer
   * up follows, so the pressed status and a holdable click end here; neither "onPointerUp" nor a
   * click is reported, because the press was not completed.
   */
  const handlePointerCancel: React.PointerEventHandler<E> = (event): void => {
    elementPointerDownRef.current = undefined;
    setPressed(false);

    if (holdable) {
      stopHoldableClick(event);
    }
  };


  /**
   * Handler for the synthetic React events "onTouchStart", "onTouchEnd", and "onTouchMove" of the
   * element, this hook is used for. It is used to stop the propagation of all of these events. This
   * is importent to prevent touch scrolling of the underlying elements.
   */
  const handleTouch: React.TouchEventHandler<E> = (event): void => {
    event.stopPropagation();
  };


  /**
   * Handler for the synthetic React event "onContextMenu" of the element, this hook is used for.
   * The default behaviour, showing the context menu of the browser, is prevented at holdable clicks
   * (important for touch).
   */
  const handleContextMenu: React.MouseEventHandler<E> = (event): void => {
    if (holdable) {
      event.preventDefault();
    }
  };


  /**
   * Handler for the synthetic React event "onMouseEnter" of the element, this hook is used for.
   */
  const handleMouseEnter: React.MouseEventHandler<E> = (event): void => {
    elementMouseEnterRef.current = event.target;
    setIsHovered(true);
  };


  /**
   * Handler for the synthetic React event "onMouseLeave" of the element, this hook is used for.
   * This event is used to end the pressed status and stop a holdable click, if the mouse is moved
   * out of the element between pointer down and pointer up.
   */
  const handleMouseLeave: React.MouseEventHandler<E> = (event): void => {
    elementMouseEnterRef.current = undefined;
    setIsHovered(false);

    if (enablePointer) {
      setPressed(false);

      if (holdable) {
        stopHoldableClick(event);
      }
    }
  };


  /**
   * Handler for the synthetic React event "onKeyDown" of the element, this hook is used for. A key
   * listed in "keysForClick" has its default prevented, because the element takes it as a click.
   */
  const handleKeyDown: React.KeyboardEventHandler<E> = (event): void => {
    elementKeyDownRef.current = event.target;

    // Only if the key is listed in option "keysForClick"...
    if (keysForClick.includes(event.key)) {
      // The browser's own reaction to the key is suppressed: space would otherwise scroll the page
      // behind the focused element. This runs on every key down, because holding the key repeats
      // the event and every repeat scrolls anew.
      event.preventDefault();

      // ...and only if not yet pressed, because onKeyDown is fired multiple times if it is held
      // down...
      if (!isPressedRef.current) {
        setPressed(true);

        if (holdable) {
          startHoldableClick(event);
        }
      }
    }

    // On every key down...
    onKey?.(event);
  };


  /**
   * Handler for the synthetic React event "onKeyUp" of the element, this hook is used for.
   */
  const handleKeyUp: React.KeyboardEventHandler<E> = (event): void => {
    elementKeyDownRef.current = undefined;

    if (keysForClick.includes(event.key)) {
      if (holdable) {
        stopHoldableClick(event);
      } else if (isPressedRef.current) {
        // prevent key up events without key down events, happened before
        onClick?.(event);
      }

      setPressed(false);
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (!isFocusEnabled && prevsRef.current.isFocusEnabled && elementFocusRef.current) {
      elementFocusRef.current.dispatchEvent(new FocusEvent('blur', { bubbles: true, cancelable: true }));
    }

    if (!isPointerEnabled && prevsRef.current.isPointerEnabled && elementPointerDownRef.current) {
      elementPointerDownRef.current.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
    }

    if (!isMouseEnabled && prevsRef.current.isMouseEnabled && elementMouseEnterRef.current) {
      elementMouseEnterRef.current.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, cancelable: true }));
    }

    if (!isKeyboardEnabled && prevsRef.current.isKeyboardEnabled && elementKeyDownRef.current) {
      elementKeyDownRef.current.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true }));
    }

    prevsRef.current = {
      isFocusEnabled, isPointerEnabled, isMouseEnabled, isKeyboardEnabled,
    };
  }, [isFocusEnabled, isPointerEnabled, isMouseEnabled, isKeyboardEnabled]);


  // Effect that clears the hold delay timer at unmount.
  useEffect(() => () => {
    clearTimeout(holdDelayTimerRef.current);
  }, []);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return {
    interactionProps: {
      'aria-disabled': disableAllEvents,
      tabIndex: modTabIndex,
      ...(isFocusEnabled && {
        onFocus: handleFocus,
        onBlur: handleBlur,
      }),
      ...(isPointerEnabled && {
        onClick: handleClick,
        onPointerDown: handlePointerDown,
        onPointerUp: handlePointerUp,
        onPointerCancel: handlePointerCancel,
        // The three handlers do nothing but stop their event, so leaving them out is what lets a
        // touch reach the ancestors - see the prop's description.
        ...(!enableTouchPropagation && {
          onTouchStart: handleTouch,
          onTouchEnd: handleTouch,
          onTouchMove: handleTouch,
        }),
        onContextMenu: handleContextMenu,
      }),
      ...(isMouseEnabled && {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      }),
      ...(isKeyboardEnabled && {
        onKeyDown: handleKeyDown,
        onKeyUp: handleKeyUp,
      }),
    },
    isPressed,
    isFocused,
    isHovered,
  };
  //                                                                                  </editor-fold>
};
