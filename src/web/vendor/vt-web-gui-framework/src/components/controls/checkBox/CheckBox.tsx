import { useImperativeHandle, useRef } from 'react';

import { LabelForControls } from 'components/helpers/labelForControls';
import { useInteractions } from 'components/hooks/useInteractions';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';
import { isNonEmptyStringOrNumber } from 'utils/type';

import * as css from './checkBox.scss';
import { type CheckBoxProps, CheckBoxStatus, checkBoxStylingProps } from './checkBox.types';
import { Icon } from './icon/Icon';


const keysForClick = [' '];


/**
 * React component of the control component "CheckBox", that can be used everywhere in
 * VtWebGuiFramework, placed inline with CSS grid.
 */
const CheckBox = ({
  ref, id, type = 'tickBox', large = false, status = CheckBoxStatus.IDLE,
  label = '', labelType = 'value', labelFirst = false, wrapLabel = false,
  value = false, onClick, ...restProps
}: CheckBoxProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const checkBoxElemRef = useRef<HTMLSpanElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, checkBoxStylingProps);
  const isDisabled = (status === CheckBoxStatus.DISABLED);
  const isWithLabel = isNonEmptyStringOrNumber(label);
  let iconStatus: React.ComponentProps<typeof Icon>['iconStatus'],
    ariaChecked: 'true' | 'false' | 'mixed';

  // The mixed value belongs to the tick box alone: a radio button knows checked and unchecked and
  // nothing else, so there it reads as unchecked rather than as a third value.
  if (value === true) {
    iconStatus = 'checked';
    ariaChecked = 'true';
  } else if ((type === 'tickBox') && (value === 'tickBoxMixed')) {
    iconStatus = 'mixed';
    ariaChecked = 'mixed';
  } else {
    iconStatus = 'unchecked';
    ariaChecked = 'false';
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
    clientLeft: checkBoxElemRef.current?.clientLeft,
    clientWidth: checkBoxElemRef.current?.clientWidth,
    clientTop: checkBoxElemRef.current?.clientTop,
    clientHeight: checkBoxElemRef.current?.clientHeight,
    getBoundingClientRect: () => checkBoxElemRef.current?.getBoundingClientRect(),
    focus: () => {
      requestAnimationFrame(() => {
        checkBoxElemRef.current?.focus();
      });
    },
    blur: () => {
      requestAnimationFrame(() => {
        checkBoxElemRef.current?.blur();
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

  const checkBoxClasses = classNames(css.checkBox, {
    // Only a labelled check box has two items to distribute, so the class stays off the one that
    // carries its icon alone.
    [css.labelFirst]: (labelFirst && isWithLabel),
    [css.disabled]: isDisabled,
  });

  return (
    <span
      ref={checkBoxElemRef}
      {...(id && { id })}
      role="checkbox"
      aria-checked={ariaChecked}
      className={checkBoxClasses}
      style={outerElemStyle}
      {...interactionProps}
    >
      <Icon
        type={type}
        large={large}
        status={status}
        labelFirst={labelFirst}
        withoutLabel={!isWithLabel}
        iconStatus={iconStatus}
      />
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

CheckBox.displayName = 'CheckBox';


export { CheckBox };
