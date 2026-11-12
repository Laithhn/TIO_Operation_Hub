import { useImperativeHandle, useRef } from 'react';

import { useInteractions } from 'components/hooks/useInteractions';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';
import { isNonEmptyStringOrNumber, isNumber } from 'utils/type';

import { getIconPath, iconExists, viewbox } from 'VtWebGuiIcons/src';

import * as css from './button.scss';
import { type ButtonProps, ButtonStatus, buttonStylingProps } from './button.types';


const defaultText = 'Btn.';


/**
 * React component of the control component "Button", that can be used everywhere in
 * VtWebGuiFramework, placed inline or inside a CSS grid.
 */
const Button = ({
  ref, id, type = 'filled', left = null, right = null, top = null, bottom = null,
  large = false, flush, status = ButtonStatus.IDLE, holdable = false, highlight, darkTheme,
  text = '', icon = '', iconRotation = 0, onClick, onHoldStart, onHoldEnd, ...restProps
}: ButtonProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const buttonElemRef = useRef<HTMLSpanElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, buttonStylingProps);
  const style = { ...outerElemStyle };

  // The four position props count as given only as a finite number, and one of them is what takes
  // an overlaid button out of the flow.
  const isWithLeft = isNumber(left, { withoutInfinite: true });
  const isWithRight = isNumber(right, { withoutInfinite: true });
  const isWithTop = isNumber(top, { withoutInfinite: true });
  const isWithBottom = isNumber(bottom, { withoutInfinite: true });

  // An overlaid button is positioned absolutely only where it was given a place of its own: at
  // least one of the four props above carrying a number. Without any of them it is placed like
  // every other button - by the grid or the line it sits in, and by its own styling props - which
  // is what lets a caller float it where the pixels are unknown to it. An axis whose two props are
  // both empty falls back to its start edge, so a button placed on one axis alone still sits where
  // that prop puts it.
  const isPositioned = (type === 'overlaid')
    && (isWithLeft || isWithRight || isWithTop || isWithBottom);

  if (isPositioned) {
    if (isWithLeft) {
      style.left = `${left}px`;
    } else if (isWithRight) {
      style.right = `${right}px`;
    } else {
      style.left = 0;
    }

    if (isWithTop) {
      style.top = `${top}px`;
    } else if (isWithBottom) {
      style.bottom = `${bottom}px`;
    } else {
      style.top = 0;
    }
  }


  // The status BUSY and the status ACTIVE exist for the filled button alone. The other three types
  // are simple buttons, and one of these two statuses on them does nothing rather than something
  // half-way: the button stays idle, and so does everything that follows from the status below.
  const isFilledOnlyStatus = (status === ButtonStatus.BUSY) || (status === ButtonStatus.ACTIVE);
  const modStatus = (isFilledOnlyStatus && (type !== 'filled')) ? ButtonStatus.IDLE : status;


  const isIdle = (
    (modStatus !== ButtonStatus.BUSY)
    && (modStatus !== ButtonStatus.ACTIVE)
    && (modStatus !== ButtonStatus.DISABLED)
  );


  const isWithIcon = iconExists(icon);
  let isWithText: boolean,
    modText = '';

  if (isNonEmptyStringOrNumber(text)) {
    isWithText = true;
    modText = String(text);
  } else if (!isWithIcon) {
    isWithText = true;
    modText = defaultText;
  } else {
    isWithText = false;
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const { interactionProps, isPressed } = useInteractions<HTMLSpanElement>({
    enablePointer: true,
    enableKeyboard: true,
    disableAllEvents: (modStatus !== ButtonStatus.IDLE),
    holdable,
    tabIndex: 0,
    onClick: (event) => {
      if (event.type.startsWith('pointer') && (document.activeElement instanceof HTMLElement)) {
        document.activeElement.blur();
      }

      onClick?.({ event });
    },
    onHoldStart: (event) => {
      onHoldStart?.({ event });
    },
    onHoldEnd: (event) => {
      onHoldEnd?.({ event });
    },
    onKey: (event) => {
      if ((event.key === 'Escape') && (document.activeElement instanceof HTMLElement)) {
        document.activeElement.blur();
      }
    },
  });


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    clientLeft: buttonElemRef.current?.clientLeft,
    clientWidth: buttonElemRef.current?.clientWidth,
    clientTop: buttonElemRef.current?.clientTop,
    clientHeight: buttonElemRef.current?.clientHeight,
    getBoundingClientRect: () => buttonElemRef.current?.getBoundingClientRect(),
    focus: () => {
      requestAnimationFrame(() => {
        buttonElemRef.current?.focus();
      });
    },
    blur: () => {
      requestAnimationFrame(() => {
        buttonElemRef.current?.blur();
      });
    },
  }), []);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const buttonClasses = classNames(css.button, {
    [css.filled]: (type === 'filled'),
    [css.tinted]: (type === 'tinted'),
    [css.bare]: (type === 'bare'),
    [css.overlaid]: (type === 'overlaid'),
    [css.positioned]: isPositioned,
    [css.large]: large,
    // One class per side, so the value "both" is the two of them together rather than a class of
    // its own - which is what it is: a button flush on both sides.
    [css.flushStart]: (flush === 'start') || (flush === 'both'),
    [css.flushEnd]: (flush === 'end') || (flush === 'both'),
    [css.withText]: isWithText,
    [css.disabled]: (modStatus === ButtonStatus.DISABLED),
    [css.busy]: (modStatus === ButtonStatus.BUSY),
    [css.active]: (modStatus === ButtonStatus.ACTIVE),
    // The three statuses above lock the button for user interaction, and every rule that has to be
    // suppressed while it is locked guards against this one class instead of against each of them.
    [css.locked]: !isIdle,
    ...(isIdle && {
      [css.highlightAttention]: (highlight === 'attention'),
      [css.highlightAttentionHigh]: (highlight === 'attentionHigh'),
      [css.highlightSignalOk]: (highlight === 'signalOk'),
      [css.highlightSignalWarning]: (highlight === 'signalWarning'),
      [css.highlightSignalError]: (highlight === 'signalError'),
      [css.highlightSolid]: (highlight === 'solid'),
    }),
    // Every type takes its form from the ground it sits on; the overlaid one alone lets the call site
    // state that ground instead, in either direction (see the prop "darkTheme").
    [css.groundDark]: (type === 'overlaid') && (darkTheme === true),
    [css.groundLight]: (type === 'overlaid') && (darkTheme === false),
    [css.pressed]: isPressed,
  });

  return (
    <span
      ref={buttonElemRef}
      {...(id && { id })}
      role="button"
      // The shimmer of a waiting button is purely visual, and the "aria-disabled" the interaction
      // props already carry says the button cannot be clicked without saying why.
      // This one does, and it reads the normalized status, so a form on which BUSY
      // does nothing says nothing either.
      aria-busy={modStatus === ButtonStatus.BUSY}
      // "aria-pressed" declares a button a toggle, and a screen reader announces one that carries
      // the attribute as switched off rather than as a plain button. So it appears only while the
      // status actually is ACTIVE: the condition is the status, not the type - that ACTIVE reaches
      // the filled form alone follows from the normalization above and is nothing this line has to
      // know.
      {...((modStatus === ButtonStatus.ACTIVE) && { 'aria-pressed': 'true' })}
      className={buttonClasses}
      style={style}
      {...interactionProps}
    >
      {isWithIcon && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <svg
          viewBox={viewbox}
          {...(iconRotation && { style: { transform: `rotate(${iconRotation}deg)` } })}
        >
          <path d={getIconPath(icon)} />
        </svg>
      )}
      {isWithText && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <span className={css.text}>{modText}</span>
      )}
      {/* The button's baseline where no label carries one: without this element a textless button
          hands out a baseline synthesized from its icon's box edge and sits too high beside a text.
          The stylesheet states the whole of it, and the check box carries the same element. */}
      {!isWithText && (
        <span className={css.baselineCarrier}>&nbsp;</span>
      )}
    </span>
  );
  //                                                                                  </editor-fold>
};

Button.displayName = 'Button';


export { Button };
