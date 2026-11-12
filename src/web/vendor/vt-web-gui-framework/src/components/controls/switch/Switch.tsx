import { useImperativeHandle, useRef } from 'react';

import { LabelForControls } from 'components/helpers/labelForControls';
import { useInteractions } from 'components/hooks/useInteractions';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';
import { isNonEmptyStringOrNumber } from 'utils/type';

import * as css from './switch.scss';
import { type SwitchProps, SwitchStatus, switchStylingProps } from './switch.types';


const keysForClick = [' '];


/**
 * React component of the control component "Switch", that can be used everywhere in
 * VtWebGuiFramework, placed inline with CSS grid. It is meant for projects that run on touch-only
 * devices, and for those alone: on a device with a pointer or a keyboard, the check box is the
 * control to use.
 */
const Switch = ({
  ref, id, status = SwitchStatus.IDLE, label = '',
  labelType = 'value', labelFirst = false, wrapLabel = false, value = false, onClick, ...restProps
}: SwitchProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const switchElemRef = useRef<HTMLSpanElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, switchStylingProps);
  const isDisabled = (status === SwitchStatus.DISABLED);
  const isWithLabel = isNonEmptyStringOrNumber(label);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    clientLeft: switchElemRef.current?.clientLeft,
    clientWidth: switchElemRef.current?.clientWidth,
    clientTop: switchElemRef.current?.clientTop,
    clientHeight: switchElemRef.current?.clientHeight,
    getBoundingClientRect: () => switchElemRef.current?.getBoundingClientRect(),
    focus: () => {
      requestAnimationFrame(() => {
        switchElemRef.current?.focus();
      });
    },
    blur: () => {
      requestAnimationFrame(() => {
        switchElemRef.current?.blur();
      });
    },
  }), []);


  const { interactionProps } = useInteractions<HTMLSpanElement>({
    enablePointer: true,
    enableKeyboard: true,
    enableFocus: true,
    disableAllEvents: isDisabled,
    keysForClick,
    tabIndex: 0,
    onClick: (event) => {
      onClick?.({ event });
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


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  // The root class cannot carry the control's own name: the exported class names are declared as
  // constants, and "switch" is a reserved word.
  const switchClasses = classNames(css.switchControl, {
    // Only a labelled switch has two items to distribute, so the class stays off the one that
    // carries its pane alone.
    [css.labelFirst]: (labelFirst && isWithLabel),
    [css.on]: value,
    [css.disabled]: isDisabled,
  });

  return (
    <span
      ref={switchElemRef}
      {...(id && { id })}
      // A switch is its own ARIA role, and it is the one the screen readers announce as "on" and
      // "off" rather than as "checked": what it switches takes effect at once, where a checked box
      // states a value that something else applies later.
      role="switch"
      aria-checked={value}
      className={switchClasses}
      style={outerElemStyle}
      {...interactionProps}
    >
      <span className={css.pane}>
        <span className={css.knob} />
        {/* The pane's baseline, and nothing else: this element carries a line box as tall as the
            pane's inside, and it is the pane's only in-flow item - the knob is positioned out of
            the flow - which is what makes the pane export a baseline at all. The switch aligns pane
            and label on it, so the label sits where a text beside the control expects it rather
            than at the pane's box edge. */}
        <span>&nbsp;</span>
      </span>
      {isWithLabel && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <LabelForControls
          disable={isDisabled}
          label={label}
          labelType={labelType}
          wrapLabel={wrapLabel}
        />
      )}
    </span>
  );
  //                                                                                  </editor-fold>
};

Switch.displayName = 'Switch';


export { Switch };
