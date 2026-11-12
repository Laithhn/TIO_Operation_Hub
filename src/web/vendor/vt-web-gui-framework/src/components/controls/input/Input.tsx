import {
  useEffect, useImperativeHandle, useRef, useState,
} from 'react';

import { IconForControls, type IconForControlsProps } from 'components/helpers/iconForControls';
import { NoticeForControls } from 'components/helpers/noticeForControls';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';
import { isNonEmptyStringOrNumber, isNumber } from 'utils/type';

import { iconExists } from 'VtWebGuiIcons/src';

import { IncDecControls } from './incDecControls/IncDecControls';
import * as css from './input.scss';
import { type InputProps, InputStatus, inputStylingProps } from './input.types';
import { ProposalList } from './proposalList/ProposalList';
import type { ProposalListHandle } from './proposalList/proposalList.types';


/**
 * Helper function to parse a given value into a string for the use as internal input value. This is
 * important for the use of the Input component with type "number" or "float". In these cases,
 * numbers given by prop "value", are converted into strings. Infinity, -Infinity, NaN, undefined,
 * null and anything else are converted into empty strings.
 */
const value2Str = (value: unknown) => {
  if (isNumber(value, { withoutInfinite: true })) {
    return value.toString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
};


/**
 *
 */
const Input = ({
  ref, id, type = 'text', status = InputStatus.IDLE, size = 0,
  bare = false, flush, textAlign, deleteButton = false, trailingIcon = '',
  proposalList, noProposalHint = '', increment = 1, min = -Infinity, max = Infinity,
  passwordVisibilityToggle = false, autoComplete = '', placeholder = '', value = '', notice = '',
  onBeforeInput, onPaste, onChange, onBlur, ...restProps
}: InputProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  // the internal input-value is always a string, as it is entered in the <input> element
  const [internalValue, setInternalValue] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showProposalList, setShowProposalList] = useState(false);

  // The props the internal value is made from, as they stood when it was last taken over. They are
  // held in a state and not in a ref because the comparison against them stands in the render body.
  // The empty object marks the first render, at which the field is filled rather than changed.
  const [prevInputs, setPrevInputs] = useState<{
    type?: InputProps['type'];
    value?: InputProps['value'];
    modMin?: number;
    modMax?: number;
  }>({});

  // A value the field made on its own and still owes prop "onChange". It is wrapped in an object
  // because null is one of the values reported, so it cannot double as "nothing to report", and
  // because a fresh object is what tells the effect below apart from the report it already sent.
  const [valueToReport, setValueToReport] = useState<{ value: string | number | null } | null>(null);

  const spanElemRef = useRef<HTMLSpanElement>(null);
  const inputElemRef = useRef<HTMLInputElement>(null);
  const proposalListRef = useRef<ProposalListHandle>(null);
  const reportedValueRef = useRef(valueToReport);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, inputStylingProps);

  const isNumericType = (type === 'number') || (type === 'float');
  const isDefaultType = !isNumericType && (type !== 'password');
  const isDisabled = (status === InputStatus.DISABLED);
  // What the two locking statuses leave: a field that is idle or that shows an error takes input,
  // the error being a statement about the value rather than about whether it may be entered.
  const isInputEnabled = (status === InputStatus.IDLE) || (status === InputStatus.ERROR);
  const isProposalListEnabled = isDefaultType && isInputEnabled && Array.isArray(proposalList);
  const showNotice = isNonEmptyStringOrNumber(notice);
  let nativeInputType: string,
    nativeInputMode: React.InputHTMLAttributes<HTMLInputElement>['inputMode'],
    modTrailingIcon: string | undefined,
    modIncrement: number | undefined,
    modMin: number,
    modMax: number;


  if (min > max) {
    modMin = -Infinity;
    modMax = Infinity;
  } else {
    modMin = min;
    modMax = max;
  }

  // A numeric field raises the digit pad of a touch device where no negative value is allowed. The
  // pads of iOS carry no minus sign, so a field that takes one keeps the full keyboard.
  switch (type) {
    case 'number':
      nativeInputType = 'text';
      nativeInputMode = (modMin >= 0) ? 'numeric' : undefined;
      modIncrement = isNumber(increment, { withoutInfinite: true, gt: 0 })
        ? Math.max(1, Math.round(increment))
        : 1;
      break;

    case 'float':
      nativeInputType = 'text';
      nativeInputMode = (modMin >= 0) ? 'decimal' : undefined;
      modIncrement = isNumber(increment, { withoutInfinite: true, gt: 0 }) ? increment : 1;
      break;

    case 'password':
      if (passwordVisibilityToggle) {
        nativeInputType = showPassword ? 'text' : 'password';
        modTrailingIcon = showPassword ? 'HIDDEN' : 'VISIBLE';
      } else {
        nativeInputType = 'password';
      }
      break;

    default:
      nativeInputType = 'text';
      modTrailingIcon = iconExists(trailingIcon) ? trailingIcon : '';
      break;
  }


  /**
   * Helper function to parse a given value depending on prop "type":
   * - If the type is "number", the result will be a number or null.
   * - If the type is "float", the result will be a floating point number or null.
   * - In all other cases the result will be a string.
   *
   * At numeric types "number" and "float", the props "min" and "max" are applied to the result.
   */
  const parseValueByType = (val: string | number | null) => {
    if (isNumericType) {
      let nextVal;

      if (isNumber(val)) {
        nextVal = (type === 'number') ? Math.round(val) : parseFloat(val.toFixed(10));
      } else if (val === null) {
        nextVal = null;
      } else {
        nextVal = (type === 'number') ? parseInt(val, 10) : parseFloat(val.replace(',', '.'));
      }

      return isNumber(nextVal, { withoutInfinite: true })
        ? Math.max(modMin, Math.min(modMax, nextVal))
        : null;
    }

    return String(val ?? '');
  };


  // The internal value is what the <input> element shows, and it is made from the props "type",
  // "value", "min" and "max". It therefore follows them here in the render body rather than being
  // corrected in an effect one render later: React discards this pass and renders again before
  // anything reaches the screen, while the effect let the field show its previous content - an
  // empty one on the first render - for the length of a frame.
  //
  // The comparison against the previous props is the guard. A state set during render always
  // re-renders the component, React skipping the bail-out it grants an identical value everywhere
  // else, so a take-over without it would never end.
  if (
    (type !== prevInputs.type)
    || (value !== prevInputs.value)
    || (modMin !== prevInputs.modMin)
    || (modMax !== prevInputs.modMax)
  ) {
    // The first render has no previous type to differ from, so the field is filled from its props
    // rather than following a type that changed.
    const hasValueChanged = (value !== prevInputs.value);
    const hasTypeChanged = (prevInputs.type !== undefined) && (type !== prevInputs.type);
    let nextVal: string | number | null;

    if (hasValueChanged) {
      // A changed prop "value" is what the field has to show from now on, so it is that value which
      // is parsed. It outranks a type changing in the same render, the value being meant for the
      // new type.
      nextVal = parseValueByType(value);
    } else if (hasTypeChanged) {
      // What stands in the field was entered under the previous type and says nothing under the new
      // one, so it goes.
      nextVal = isNumericType ? null : '';
    } else {
      // A changed range says nothing about the value: it is the value the field currently holds
      // that has to be parsed again, now against the new range.
      nextVal = parseValueByType(internalValue);
    }

    const nextValStr = value2Str(nextVal);

    // Whether the field ends up holding the value it was given. Null and the empty string both mean
    // "no value", so one standing where the other was given is no difference worth reporting: a
    // numeric field makes null out of the empty string, a text field the empty string out of null,
    // and the empty string is what every field is handed on mount, prop "value" defaulting to it.
    const isValueTaken = (nextVal === value)
      || (((nextVal === null) || (nextVal === '')) && ((value === null) || (value === '')));

    if (internalValue !== nextValStr) {
      setInternalValue(nextValStr);
    }

    // Only a value the content does not hold itself is worth a call: one the field had to parse, to
    // clamp into the range, or to drop with the type. Handing back the very value that was just
    // given would report an input the user never made, which would mark a form as edited and stop
    // later updates from outside from showing.
    if (!isValueTaken) {
      setValueToReport({ value: nextVal });
    }

    setPrevInputs({
      type, value, modMin, modMax,
    });
  }


  // What the field holds, as a number, at a numeric type - null while it holds nothing usable. It is
  // what the increment buttons step from and what bounds them. Prop "value" cannot answer that: a
  // field the content does not drive leaves it at its default, the empty string, and the buttons
  // would never reach their bound. Note that parseValueByType already applies the range, so a value
  // that is not null lies inside it.
  const numericValue = isNumericType ? (parseValueByType(internalValue) as number | null) : null;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to increment or decrement the current numeric value. Be sure, that this
   * function is only used at numeric types "number" or "float".
   */
  const incDecNumericValue = (isInc: boolean, event: React.MouseEvent<SVGElement> | React.PointerEvent<SVGElement> | React.KeyboardEvent<HTMLInputElement | SVGElement>) => {
    let nextVal = (numericValue === null)
      ? 0
      : numericValue + (isInc ? modIncrement! : -modIncrement!);

    // solve floating point precision problem
    nextVal = (type === 'float')
      ? parseFloat(nextVal.toFixed(10))
      : Math.round(nextVal);

    // A step out of the range ends at the range: the buttons walk the value, they do not take it
    // anywhere the field would not accept by hand. This also catches the step out of an empty
    // field, which starts at zero and may be below the minimum.
    nextVal = Math.max(modMin, Math.min(modMax, nextVal));

    setInternalValue(value2Str(nextVal));
    onChange?.({ value: nextVal, event });
  };


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    clientLeft: spanElemRef.current?.clientLeft,
    clientWidth: spanElemRef.current?.clientWidth,
    clientTop: spanElemRef.current?.clientTop,
    clientHeight: spanElemRef.current?.clientHeight,
    getBoundingClientRect: () => spanElemRef.current?.getBoundingClientRect(),
    focus: () => {
      requestAnimationFrame(() => {
        inputElemRef.current?.focus();
      });
    },
    blur: () => {
      requestAnimationFrame(() => {
        inputElemRef.current?.blur();
      });
    },
    select: () => {
      requestAnimationFrame(() => {
        inputElemRef.current?.select();
      });
    },
  }), []);


  /**
   * Handler for the synthetic React event "onKeyDown" of the native input element.
   */
  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        if (isProposalListEnabled) {
          event.stopPropagation();
          event.preventDefault();

          setShowProposalList(true);

          if (event.key === 'ArrowUp') {
            proposalListRef.current?.markPrevious();
          } else {
            proposalListRef.current?.markNext();
          }
        } else if (modIncrement) {
          event.stopPropagation();
          event.preventDefault();
          incDecNumericValue((event.key === 'ArrowUp'), event);
        }
        break;

      case 'Enter':
        if (isProposalListEnabled) {
          proposalListRef.current?.selectMarked();
        }
        break;

      case 'Escape':
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        break;
      // no default
    }
  };


  /**
   * Handler for the synthetic React event "onBeforeInput" of the native input element to check the
   * input. At numerical and floating point input elements, this handler has its own checks.
   * Otherwise prop "onBeforeInput" is called.
   */
  const handleBeforeInput: React.InputEventHandler<HTMLInputElement> = (event) => {
    if (isNumericType) {
      const inputVal = event.currentTarget.value;
      const nextChar = event.data;
      const inputPosition = event.currentTarget.selectionStart;

      if (
        !/[0-9]/.test(nextChar)
        && (
          (modMin >= 0)
          || (inputPosition !== 0)
          || inputVal.includes('-')
          || (nextChar !== '-')
        )
        && (
          (type !== 'float')
          || /[,.]/.test(inputVal)
          || !/[,.]/.test(nextChar)
        )
      ) {
        // In the case of number or float: prevent overtaking of the next character, if it is not a
        // number, not a minus at the first position and no valid decimal point.
        event.preventDefault();
      }
    } else {
      onBeforeInput?.({ event });
    }
  };


  /**
   * Handler for the synthetic React event "onPaste" of the native input element to check the
   * insertion from clipboard. At numerical and floating point input elements, this handler has its
   * own checks. Otherwise prop "onPaste" is called.
   */
  const handlePaste: React.ClipboardEventHandler<HTMLInputElement> = (event) => {
    const inputVal = event.currentTarget.value;
    const insertion = event.clipboardData.getData('text/plain');
    const inputPositionStart = event.currentTarget.selectionStart;
    const inputPositionEnd = event.currentTarget.selectionEnd;
    const nextVal = `${inputVal.substring(0, inputPositionStart ?? undefined)}${insertion}${(typeof inputPositionEnd === 'number') ? inputVal.substring(inputPositionEnd) : ''}`;

    if (
      isNumericType
      && (
        (type !== 'number')
        || !/^-?[0-9]*$/.test(nextVal)
      )
      && (
        (type !== 'float')
        || !/^-?[0-9]*[,.]?[0-9]*$/.test(nextVal)
      )
    ) {
      // In the case of number or float: prevent overtaking of the insertion, if the resulted string
      // is not a valid number.
      event.preventDefault();
    } else {
      onPaste?.({ event });
    }
  };


  /**
   * Handler for the synthetic React event "onChange" of the native input element to take over EVERY
   * input internally but check it before giving it to prop "onChange". This is if you enter a minus
   * at a numerical input element for example. The minus is taken over but null is given to prop
   * "onChange".
   */
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    if (isNumericType) {
      const inputVal = (type === 'number') ? event.currentTarget.value : event.currentTarget.value.replace(',', '.');
      let nextVal = (type === 'number') ? parseInt(inputVal, 10) : parseFloat(inputVal);

      if (isNumber(nextVal, { withoutInfinite: true })) {
        nextVal = Math.max(modMin, Math.min(modMax, nextVal));
        setInternalValue(inputVal.endsWith('.') ? `${nextVal}.` : String(nextVal));
        onChange?.({ value: nextVal, event });
      } else if (event.currentTarget.value === '') {
        setInternalValue(event.currentTarget.value);
        onChange?.({ value: null, event });
      } else {
        setInternalValue(event.currentTarget.value);
      }
    } else {
      setInternalValue(event.currentTarget.value);
      setShowProposalList(isProposalListEnabled);
      onChange?.({ value: event.currentTarget.value, event });
    }
  };


  /**
   * Handler for the synthetic React event "onBlur" of the native input element to parse the input
   * at leaving the element and finally setting it internally and to prop "onBlur".
   */
  const handleBlur: React.FocusEventHandler<HTMLInputElement> = (event) => {
    const nextVal = parseValueByType(event.currentTarget.value);

    setInternalValue(value2Str(nextVal));
    setShowProposalList(false);
    onBlur?.({ value: nextVal, event });
  };


  /**
   * Handler for the callback prop "onClick" of the helper component "IconForControls".
   */
  const handleDelete: NonNullable<IconForControlsProps['onClick']> = (event) => {
    event.stopPropagation();

    setInternalValue('');
    onChange?.({ value: isNumericType ? null : '', event });
    inputElemRef.current?.focus();
  };


  /**
   * Handler for the callback prop "onIncDec" of the helper component "IncDecControls".
   * This handler is only used, if the type of the input component is "number" or "float".
   */
  const handleIncDec: React.ComponentProps<typeof IncDecControls>['onIncDec'] = (isInc, event) => {
    incDecNumericValue(isInc, event);
  };


  /**
   * Handler for the callback prop "onClick" of the helper component "IconForControls".
   * This handler is only used, if the type of the input component is "password".
   */
  const handleTogglePasswordVisibility: NonNullable<IconForControlsProps['onClick']> = (event) => {
    event.preventDefault();
    setShowPassword((prevState) => !prevState);
  };


  /**
   * Handler for the callback prop "onSelect" of the sub-component "ProposalList".
   */
  const handleSelectProposal: React.ComponentProps<typeof ProposalList>['onSelect'] = (idx, event) => {
    if (proposalList?.[idx]) {
      setInternalValue(value2Str(proposalList[idx]));
      onChange?.({
        value: proposalList[idx],
        ...(event && { event }),
      });
      inputElemRef.current?.focus();
    }
  };


  /**
   * Handler for the callback prop "onClose" of the sub-component "ProposalList".
   */
  const handleCloseProposalList: React.ComponentProps<typeof ProposalList>['onClose'] = () => {
    setShowProposalList(false);
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // Effect to hand a value the field made on its own to prop "onChange". The call waits for an
  // effect because it reaches into the content, which the render body deciding it must not do. The
  // report is not cleared afterwards but remembered in a ref, which is what keeps it at one call:
  // clearing it would be a setState inside an effect, and an unmemoized "onChange" re-running the
  // effect would send the standing report a second time.
  useEffect(() => {
    if (valueToReport && (valueToReport !== reportedValueRef.current)) {
      reportedValueRef.current = valueToReport;
      onChange?.({ value: valueToReport.value });
    }
  }, [onChange, valueToReport]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  // The pane is the field's whole face: it holds the value, it answers the pointer and it states
  // the status, all on this one element. A field flush on both sides carries both flush classes -
  // there is no third class for it.
  const inputClasses = classNames(css.input, {
    [css.bare]: bare,
    [css.flushStart]: (flush === 'start') || (flush === 'both'),
    [css.flushEnd]: (flush === 'end') || (flush === 'both'),
    [css.disabled]: isDisabled,
    [css.busy]: (status === InputStatus.BUSY),
    [css.error]: (status === InputStatus.ERROR),
  });

  // The value the user typed keeps its own colour whatever the status says: colouring the text
  // somebody is reading costs legibility exactly where it is needed. ERROR speaks through the pane's
  // edge instead.
  const inputElemClasses = classNames(css.inputElem, {
    [css.typoDisabled]: isDisabled,
  });

  const inputElemStyle = {
    ...(textAlign && { textAlign }),
  };


  return (
    <span className={css.inputContr} style={outerElemStyle}>
      <span ref={spanElemRef} className={inputClasses}>
        <input
          ref={inputElemRef}
          {...(id && { id })}
          type={nativeInputType}
          {...(nativeInputMode && { inputMode: nativeInputMode })}
          className={inputElemClasses}
          style={inputElemStyle}
          {...(size && { size })}
          disabled={!isInputEnabled}
          {...(autoComplete && { autoComplete })}
          placeholder={placeholder}
          value={internalValue}
          onKeyDown={handleKeyDown}
          onBeforeInput={handleBeforeInput}
          onPaste={handlePaste}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {deleteButton && (internalValue !== '') && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
          <IconForControls disable={!isInputEnabled} icon="DELETE" onClick={handleDelete} />
        )}
        {!!modIncrement && (
          <IncDecControls disableIncrement={isNumber(numericValue, { gte: modMax })} disableDecrement={isNumber(numericValue, { lte: modMin })} onIncDec={handleIncDec} />
        )}
        {(!!modTrailingIcon || (status === InputStatus.BUSY)) && (
          <IconForControls
            disable={isDisabled}
            icon={modTrailingIcon!}
            showSpinner={status === InputStatus.BUSY}
            {...(passwordVisibilityToggle && { onClick: handleTogglePasswordVisibility })}
          />
        )}
      </span>
      {showNotice && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <NoticeForControls disable={isDisabled} notice={notice} isErrorText={(status === InputStatus.ERROR)} />
      )}
      {isProposalListEnabled && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <ProposalList
          ref={proposalListRef}
          spanElemRef={spanElemRef}
          show={showProposalList}
          list={proposalList}
          value={internalValue}
          emptyHint={noProposalHint}
          onSelect={handleSelectProposal}
          onClose={handleCloseProposalList}
        />
      )}
    </span>
  );
  //                                                                                  </editor-fold>
};

Input.displayName = 'Input';


export { Input };
