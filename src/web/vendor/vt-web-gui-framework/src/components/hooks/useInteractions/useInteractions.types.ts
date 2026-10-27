/** The props of the React hook "useInteractions". */
export interface UseInteractionsProps<E = Element> {
  /** Set to true, to add the synthetic React events "onPointerDown", "onPointerUp",
   * "onPointerCancel", "onClick", "onTouchStart", "onTouchEnd", "onTouchMove" and "onContextMenu"
   * to the returned object. In
   * dependence on the prop "holdable", either simple clicks or holdable clicks are possible by
   * using a pointer (mouse, touch, etc.). Default: false. */
  readonly enablePointer?: boolean;
  /** Set to true, to add the synthetic React events "onKeyDown" and "onKeyUp" to the returned
   * object. If so, with the keys listet in prop "keysForClick" simple or holdable clicks can be
   * done with the keyboard, in dependence on prop "holdable". Default: false. */
  readonly enableKeyboard?: boolean;
  /** Only available, if prop "tabIndex" is set to a number. So set to true, to add the synthetic
   * React events "onFocus" and "onBlur" to the returned object and delegate them to the callback
   * functions onFocusIn and onFocusOut. Additionaly it will result to the returned boolean value
   * "isFocus". Default: false. */
  readonly enableFocus?: boolean;
  /** Set to true, to disable all events, set in this hook. Additinally this sets the attribute
   * "aria-disabled" to the returned object. Default: false. */
  readonly disableAllEvents?: boolean;
  /** Only relevant if prop "enablePointer" is true. The three touch events this hook adds do
   * nothing but stop their own propagation, which keeps a touch on the element from scrolling the
   * elements below it. Set this prop to true to leave them out, so that a touch reaches the
   * element's ancestors: an element that is clickable and sits inside a container the user scrolls
   * by touch - a tab of a scrolling tab bar, for example - would otherwise block that scrolling
   * over its own area. Default: false. */
  readonly enableTouchPropagation?: boolean;
  /** Set to true, to enable the hold-meachanism of the pointers and keys. Default: false. */
  readonly holdable?: boolean;
  /** Possibility to mask out pointer buttons from the pointer event by setting to 0: (1st bit:
   * primary button, 2nd bit: secondary button, 3rd bit: auxiliary button, 4th and 5th bit: 4th and
   * 5th button). This is only relevant for the delegation of the events "onPointerDown" and
   * "onPointerUp" to the props "onPointerDown" and "onPointerUp". If not set, all five pointer
   * buttons are enabled (0b11111).
   * @example
   * ```typescript
   * useInteractions({
   *   // ...
   *   pointerButtonMask: 0b00011, // only primary and secondary buttons are enabled
   *   // ...
   * });
   * ``` */
  readonly pointerButtonMask?: number;
  /** List of keys, that will used for keys to click. Prop "enableKeyboard" must be set to
   * true for this. If not set, the return and the space key are set (see example). A key listed
   * here has its default prevented at the key down event, so that the space key does not scroll
   * the page behind the element.
   * @example
   * ```typescript
   * useInteractions({
   *   // ...
   *   keysForClick: useMemo(() => ['Enter', ' '], []),
   *   // ...
   * });
   * ```
   */
  readonly keysForClick?: string[];
  /** Set to a number to enable tabbing the element, if not disabled. The attribute "tabIndex" is
   * set to the returned object. This will also enable the focus mechanism (see props "enableFocus",
   * "onFocusIn" and "onFocusOut"). */
  readonly tabIndex?: number;
  /** Callback prop that is called at the focus event. Preconditions: prop "enableFocus" is true,
   * prop "disableAllEvents" is false and prop "tabIndex" is set to a number. */
  readonly onFocusIn?: (event: React.FocusEvent<E>) => void;
  /** Callback prop that is called at the blur event. Preconditions: prop "enableFocus" is true,
   * prop "disableAllEvents" is false and prop "tabIndex" is set to a number. */
  readonly onFocusOut?: (event: React.FocusEvent<E>) => void;
  /** Callback prop that is called at simple clicks at the click event (preconditions: prop
   * "enablePointer" is true, prop "disableAllEvents" is false and prop "holdable" is false) and at
   * the key up event (preconditions: prop "enableKeyboard" is true, prop "disableAllEvents" is
   * false, prop "holdable" is false and the key must be listed in prop "keysForClick"). It is also
   * called at holdable clicks at the pointer down event with the main button (preconditions: prop
   * "enablePointer" is true, prop "disableAllEvents" is false and prop "holdable" is true) and at
   * the key down event (preconditions: prop "enableKeyboard" is true, prop "disableAllEvents" is
   * false, prop "holdable" is true and the key must be listed in prop "keysForClick"). */
  readonly onClick?: (event: React.PointerEvent<E> | React.MouseEvent<E> | React.KeyboardEvent<E>) => void;
  /** Callback prop that is called at pointer down event. Preconditions: prop "enablePointer" is
   * true, prop "disableAllEvents" is false and the button must be masked in prop
   * "pointerButtonMask". */
  readonly onPointerDown?: (event: React.PointerEvent<E>) => void;
  /** Callback prop that is called at pointer up event. Preconditions: prop "enablePointer" is true,
   * prop "disableAllEvents" is false and the button must be masked in prop "pointerButtonMask". */
  readonly onPointerUp?: (event: React.PointerEvent<E>) => void;
  /** Callback prop that is called only at holdable clicks at the pointer down event with the main
   * button (after delay time). Preconditions: prop "enablePointer" is true, prop "disableAllEvents"
   * is false and prop "holdable" is true. It is also called at holdable clicks at the key down
   * event (after delay time) with this preconditions: prop "enableKeyboard" is true, prop
   * "disableAllEvents" is false, prop "holdable" is true and the key must be listed in prop
   * "keysForClick". */
  readonly onHoldStart?: (event: React.PointerEvent<E> | React.KeyboardEvent<E>) => void;
  /** Callback prop that is called only at holdable clicks at the click event. Preconditions: prop
   * "enablePointer" is true, prop "disableAllEvents" is false and prop "holdable" is true. It is
   * also called at holdable clicks at the key up event with this preconditions: prop
   * "enableKeyboard" is true, prop "disableAllEvents" is false, prop "holdable" is true and the key
   * must be listed in prop "keysForClick". */
  readonly onHoldEnd?: (event: React.PointerEvent<E> | React.MouseEvent<E> | React.KeyboardEvent<E>) => void;
  /** Callback prop that is called at any key down event of the element. Preconditions: prop
   * "enableKeyboard" is true and prop "disableAllEvents" is false. */
  readonly onKey?: (event: React.KeyboardEvent<E>) => void;
}


/** The returned value of the React hook "useInteractions". */
export interface UseInteractionsResult<E = Element> {
  /** Object with HTML attributes for the interaction, that can directly set to the HTML element. */
  interactionProps: {
    /** True of false, in dependence of prop "disableAllEvents" */
    'aria-disabled': boolean;
    /** The tab index, if given (see prop "tabIndex") and if prop "disableAllEvents" is false. */
    tabIndex?: number;
    /** Handler for the synthetic React event "onFocus". Only if prop "disableAllEvents" is false, a
     * tab index is given (see prop "tabIndex") and prop "enableFocus" is true. */
    onFocus?: React.FocusEventHandler<E>;
    /** Handler for the synthetic React event "onBlur". Only if prop "disableAllEvents" is false, a
     * tab index is given (see prop "tabIndex") and prop "enableFocus" is true. */
    onBlur?: React.FocusEventHandler<E>;
    /** Handler for the synthetic React event "onClick". Only if prop "disableAllEvents" is false
     * and prop "enablePointer" is true. */
    onClick?: React.MouseEventHandler<E>;
    /** Handler for the synthetic React event "onPointerDown". Only if prop "disableAllEvents" is
     * false and prop "enablePointer" is true. */
    onPointerDown?: React.PointerEventHandler<E>;
    /** Handler for the synthetic React event "onPointerUp". Only if prop "disableAllEvents" is
     * false and prop "enablePointer" is true. */
    onPointerUp?: React.PointerEventHandler<E>;
    /** Handler for the synthetic React event "onPointerCancel". Only if prop "disableAllEvents" is
     * false and prop "enablePointer" is true. */
    onPointerCancel?: React.PointerEventHandler<E>;
    /** Handler for the synthetic React event "onTouchStart". Only if prop "disableAllEvents" is
     * false and prop "enablePointer" is true. */
    onTouchStart?: React.TouchEventHandler<E>;
    /** Handler for the synthetic React event "onTouchEnd". Only if prop "disableAllEvents" is false
     * and prop "enablePointer" is true. */
    onTouchEnd?: React.TouchEventHandler<E>;
    /** Handler for the synthetic React event "onTouchMove". Only if prop "disableAllEvents" is
     * false and prop "enablePointer" is true. */
    onTouchMove?: React.TouchEventHandler<E>;
    /** Handler for the synthetic React event "onContextMenu". Only if prop "disableAllEvents" is
     * false and prop "enablePointer" is true. */
    onContextMenu?: React.MouseEventHandler<E>;
    /** Handler for the synthetic React event "onMouseEnter". Only if prop "disableAllEvents" is
     * false. */
    onMouseEnter?: React.MouseEventHandler<E>;
    /** Handler for the synthetic React event "onMouseLeave". Only if prop "disableAllEvents" is
     * false. */
    onMouseLeave?: React.MouseEventHandler<E>;
    /** Handler for the synthetic React event "onKeyDown". Only if prop "disableAllEvents" is false
     * and prop "enableKeyboard" is true. */
    onKeyDown?: React.KeyboardEventHandler<E>;
    /** Handler for the synthetic React event "onKeyUp". Only if prop "disableAllEvents" is false
     * and prop "enableKeyboard" is true. */
    onKeyUp?: React.KeyboardEventHandler<E>;
  };
  /** Is set to true while a pointer or one of the keys of prop "keysForClick" is held down on the
   * element, and false the moment it is released or the pointer leaves. How long the pressed
   * appearance stays perceptible is a question of the stylesheet, not of this hook. */
  isPressed: boolean;
  /** Is set to true between the callings of onFocus and onBlur. */
  isFocused: boolean;
  /** Is set to true between the callings of onMouseEnter and onMouseLeave. */
  isHovered: boolean;
}
