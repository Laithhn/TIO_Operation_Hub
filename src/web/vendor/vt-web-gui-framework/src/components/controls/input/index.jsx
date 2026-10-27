import PropTypes from 'prop-types';
import {
  memo, forwardRef, useState, useRef, useImperativeHandle, useCallback, useEffect,
} from 'react';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import IconForControls from 'components/helpers/iconForControls';
import NoticeForControls from 'components/helpers/noticeForControls';
import useStylingProps from 'components/hooks/useStylingProps';
import classNames from 'utils/classNames';

import IncDecControls from './incDecControls';
import inputDefines from './defines';
import { InputType, InputState } from './enums';
import css from './input.scss';
import stylingProps from './stylingProps';


const noticeBottomPx = (
  ((defines.layout.controls.heightDefault - inputDefines.input.innerHeight) / -2)
  - defines.layout.controls.noticeHeight
);


/**
 * Helper function to parse a given value into a string for the use as internal input value. This is
 * important for the use of the control element as "NUMBER" or "FLOAT". In these cases, numbers
 * given by prop "value", are converted into strings. Infinity, -Infinity, NaN, undefined, null and
 * anything else are converted into empty strings.
 */
const value2Str = (value) => {
  const valueType = typeof value;

  if ((valueType === 'number') && Number.isFinite(value)) {
    return value.toString();
  }

  if (valueType === 'string') {
    return value;
  }

  return '';
};


/**
 * Memoized React component of an input control element.
 */
const Input = memo(forwardRef(({
  id, htmlId, type, state, size, darkTheme, noLine, withBackground, textAlign, deleteButton,
  trailingIcon, increment, min, max, passwordVisibilityToggle, autoComplete, value, notice,
  onBeforeInput, onPaste, onChange, onBlur, ...restProps
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [internalValueStr, setInternalValueStr] = useState(value2Str(Input.defaultProps.value)); // the internal input-value is always a string, as it is entered in the <input> element.
  const [showPassword, setShowPassword] = useState(false);

  const prevsRef = useRef({});
  const inputRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { iconExists } = useIconsAsync();
  const { outerElemStyle } = useStylingProps(restProps, stylingProps);

  const enableInput = (state === InputState.IDLE) || (state === InputState.ERROR);
  const showNotice = ((typeof notice === 'string') && (notice !== '')) || (typeof notice === 'number');
  let nativeInputType, modTrailingIcon, modIncrement, modMin, modMax;

  if (min > max) {
    modMin = Input.defaultProps.min;
    modMax = Input.defaultProps.max;
  } else {
    modMin = min;
    modMax = max;
  }

  switch (type) {
    case InputType.TEXT:
      nativeInputType = 'text';
      modTrailingIcon = iconExists(trailingIcon) ? trailingIcon : '';
      break;

    case InputType.NUMBER:
      nativeInputType = 'text';
      modIncrement = (Number.isFinite(increment) && (increment > 0))
        ? Math.max(1, Math.round(increment)) : Input.defaultProps.increment;
      break;

    case InputType.FLOAT:
      nativeInputType = 'text';
      modIncrement = (Number.isFinite(increment) && (increment > 0))
        ? increment : Input.defaultProps.increment;
      break;

    case InputType.PASSWORD:
      if (passwordVisibilityToggle) {
        nativeInputType = showPassword ? 'text' : 'password';
        modTrailingIcon = showPassword ? 'HIDDEN' : 'VISIBLE';
      } else {
        nativeInputType = 'password';
      }
      break;

    default:
      nativeInputType = 'text';
      break;
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to parse a given value into a number, floating point number or string,
   * depending on prop "type".
   */
  const parseValueByType = useCallback((givenValue) => {
    if (type === InputType.NUMBER) {
      const nextValue = parseInt(givenValue, 10);
      return Number.isFinite(nextValue) ? Math.max(modMin, Math.min(modMax, nextValue)) : null;
    }

    if (type === InputType.FLOAT) {
      const nextValue = parseFloat((typeof givenValue === 'string') ? givenValue.replace(',', '.') : givenValue);
      return Number.isFinite(nextValue) ? Math.max(modMin, Math.min(modMax, nextValue)) : null;
    }

    return (givenValue === null) ? '' : givenValue.toString();
  }, [type, modMin, modMax]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    focus: () => {
      requestAnimationFrame(() => {
        inputRef.current.focus();
      });
    },
    blur: () => {
      requestAnimationFrame(() => {
        inputRef.current.blur();
      });
    },
    select: () => {
      requestAnimationFrame(() => {
        inputRef.current.select();
      });
    },
  }), []);


  /**
   * Handler for synthetic React event "onBeforeInput" on the native input element to check the
   * input. At numerical and floating point input elements, this handler has its own checks.
   * Otherwise prop "onBeforeInput" is called.
   */
  const handleBeforeInput = (event) => {
    const prevInput = event.target.value;
    const nextChar = event.data;
    const inputPosition = event.target.selectionStart;

    if (
      ((type === InputType.NUMBER) || (type === InputType.FLOAT))
      && !/[0-9]/.test(nextChar)
      && (
        (inputPosition !== 0)
        || prevInput.includes('-')
        || (nextChar !== '-')
      )
      && (
        (type !== InputType.FLOAT)
        || /[,.]/.test(prevInput)
        || !/[,.]/.test(nextChar)
      )
    ) {
      // In the case of number or float: prevent overtaking of the next character, if it is not a
      // number, not a minus at the first position and no valid decimal point.
      event.preventDefault();
    } else {
      onBeforeInput(id, event);
    }
  };


  /**
   * Handler for synthetic React event "onPaste" on the native input element to check the insertion.
   * At numerical and floating point input elements, this handler has its own checks. Otherwise prop
   * "onPaste" is called.
   */
  const handlePaste = (event) => {
    const prevInput = event.target.value;
    const insertion = event.clipboardData.getData('text/plain');
    const inputPositionStart = event.target.selectionStart;
    const inputPositionEnd = event.target.selectionEnd;
    const nextValue = `${prevInput.substring(0, inputPositionStart)}${insertion}${prevInput.substring(inputPositionEnd)}`;

    if (
      ((type === InputType.NUMBER) || (type === InputType.FLOAT))
      && (
        (type !== InputType.NUMBER)
        || !/^-?[0-9]*$/.test(nextValue)
      )
      && (
        (type !== InputType.FLOAT)
        || !/^-?[0-9]*[,.]?[0-9]*$/.test(nextValue)
      )
    ) {
      // In the case of number or float: prevent overtaking of the insertion, if the resulted string
      // is not a valid number.
      event.preventDefault();
    } else {
      onPaste(id, event);
    }
  };


  /**
   * Handler for synthetic React event "onChange" on the input element to take over EVERY input
   * internally but parse it before giving it to prop "onChange".
   * This is if you enter a minus at a numerical input element for example, the minus is took over
   * but null is given to prop "onChange".
   */
  const handleChange = (event) => {
    setInternalValueStr(event.target.value);
    onChange(parseValueByType(event.target.value), id, event);
  };


  /**
   * Handler for synthetic React event "onBlur" on the input element to parse the input at leaving
   * the element and finally setting it internally and to prop "onBlur".
   */
  const handleBlur = (event) => {
    const parsedValue = parseValueByType(event.target.value);

    setInternalValueStr(value2Str(parsedValue));
    onBlur(parsedValue, id, event);
  };


  /**
   *
   */
  const handleDelete = useCallback((event) => {
    event.stopPropagation();

    setInternalValueStr('');
    onChange(parseValueByType(''), id, event);
    inputRef.current.focus();
  }, [id, onChange, parseValueByType]);


  /**
   *
   */
  const handleIncDec = useCallback((isInc, event) => {
    const parsedPrevValue = parseValueByType(internalValueStr);
    let nextValue;

    if (parsedPrevValue === null) {
      nextValue = parseValueByType(0);
    } else {
      nextValue = parseValueByType(parsedPrevValue + (isInc ? modIncrement : -modIncrement));
    }

    // solve floating point precision problem
    if (type === InputType.FLOAT) {
      nextValue = parseFloat(nextValue.toFixed(10));
    }

    setInternalValueStr(value2Str(nextValue));
    onChange(nextValue, id, event);
  }, [id, type, onChange, internalValueStr, modIncrement, parseValueByType]);


  /**
   *
   */
  const handleTogglePasswordVisibility = useCallback((event) => {
    event.preventDefault();
    setShowPassword(((prevState) => !prevState));
  }, []);


  /**
   * Handler for synthetic React event "onKeyDown" on the input element.
   */
  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        if (modIncrement) {
          event.stopPropagation();
          event.preventDefault();
          handleIncDec((event.key === 'ArrowUp'), event);
        }
        break;

      case 'Escape':
        document.activeElement?.blur();
        break;
      // no default
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // Effect to clear the input, if the input type changed.
  useEffect(() => {
    if (type !== prevsRef.current.type) {
      if (prevsRef.current.type !== undefined) {
        setInternalValueStr('');
        onChange(parseValueByType(''), id);
      }

      prevsRef.current.type = type;
    }
  }, [id, type, onChange, parseValueByType]);


  // Effect to take recalculate the internal value if the given minimium and maximum values were
  // changed.
  useEffect(() => {
    if ((modMin !== prevsRef.current.modMin) || (modMax !== prevsRef.current.modMax)) {
      const nextValue = parseValueByType(internalValueStr);
      const nextValueStr = value2Str(nextValue);

      if (nextValueStr !== internalValueStr) {
        setInternalValueStr(nextValueStr);
        onChange(nextValue, id, {});
      }

      prevsRef.current.modMin = modMin;
      prevsRef.current.modMax = modMax;
    }
  }, [id, onChange, internalValueStr, modMin, modMax, parseValueByType]);


  // Effect to take over the value from prop "value" if it was changed from outside.
  useEffect(() => {
    if (value !== prevsRef.current.value) {
      const nextValue = parseValueByType(value);
      const nextValueStr = value2Str(nextValue);

      if (nextValueStr !== internalValueStr) {
        setInternalValueStr(nextValueStr);
        onChange(nextValue, id, {});
      }

      prevsRef.current.value = value;
    }
  }, [id, value, onChange, internalValueStr, parseValueByType]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const inputClasses = classNames(css.input, {
    [css.disabled]: (state === InputState.DISABLED),
    [css.inactive]: (state === InputState.BUSY),
    [css.error]: (state === InputState.ERROR),
    [css.noLine]: noLine,
    [css.withBackground]: withBackground,
    [css.darkTheme]: darkTheme,
    [css.showNotice]: showNotice,
  });

  const inputElemClasses = classNames(css.inputElem, {
    [css.typoDisabled]: (state === InputState.DISABLED),
    [css.typoDarkTheme]: darkTheme,
  });

  const inputElemStyle = {
    ...(!textAlign.isDefault && { textAlign: textAlign.cssValue }),
  };


  return (
    <span className={inputClasses} style={outerElemStyle}>
      <input
        {...((process.env.NODE_ENV === 'development') && { id: htmlId })}
        type={nativeInputType}
        ref={inputRef}
        className={inputElemClasses}
        style={inputElemStyle}
        data-id={id}
        {...(size && { size })}
        disabled={!enableInput}
        {...(autoComplete && { autoComplete })}
        value={internalValueStr}
        onKeyDown={handleKeyDown}
        onBeforeInput={handleBeforeInput}
        onPaste={handlePaste}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {deleteButton && (internalValueStr !== '') && (
        <IconForControls
          darkTheme={darkTheme}
          disabled={!enableInput}
          icon="DELETE"
          onClick={handleDelete}
        />
      )}
      {modIncrement && (
        <IncDecControls
          darkTheme={darkTheme}
          disableDecrement={Number.isFinite(value) && (value <= modMin)}
          disableIncrement={Number.isFinite(value) && (value >= modMax)}
          onIncDec={handleIncDec}
        />
      )}
      {(modTrailingIcon || (state === InputState.BUSY)) && (
        <IconForControls
          darkTheme={darkTheme}
          disabled={state === InputState.DISABLED}
          icon={modTrailingIcon}
          showSpinner={state === InputState.BUSY}
          {...(passwordVisibilityToggle && { onClick: handleTogglePasswordVisibility })}
        />
      )}
      {showNotice && (
        <NoticeForControls
          right={withBackground ? 3 : 0}
          bottom={noticeBottomPx}
          left={withBackground ? 3 : 0}
          darkTheme={darkTheme}
          disabled={state === InputState.DISABLED}
          notice={notice}
          isErrorText={state === InputState.ERROR}
        />
      )}
    </span>
  );
  //                                                                                  </editor-fold>
}));

Input.displayName = 'Input';

Input.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  htmlId: PropTypes.string,
  type: PropTypes.instanceOf(InputType),
  state: PropTypes.instanceOf(InputState),
  size: PropTypes.number,
  darkTheme: PropTypes.bool,
  noLine: PropTypes.bool,
  withBackground: PropTypes.bool,
  textAlign: PropTypes.instanceOf(Enums.TextAlign),
  deleteButton: PropTypes.bool,
  trailingIcon: PropTypes.string, // only if type is TEXT
  increment: PropTypes.number, // only if type is NUMBER or FLOAT
  min: PropTypes.number, // only if type is NUMBER or FLOAT
  max: PropTypes.number, // only if type is NUMBER or FLOAT
  passwordVisibilityToggle: PropTypes.bool, // only if type is PASSWORD
  autoComplete: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  notice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onBeforeInput: PropTypes.func,
  onPaste: PropTypes.func,
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
};

Input.defaultProps = {
  id: '',
  htmlId: null,
  type: InputType.TEXT,
  state: InputState.IDLE,
  size: 0,
  darkTheme: false,
  noLine: false,
  withBackground: false,
  textAlign: Enums.TextAlign.AUTO,
  deleteButton: false,
  trailingIcon: '',
  increment: 1,
  min: -Infinity,
  max: Infinity,
  passwordVisibilityToggle: false,
  autoComplete: '',
  value: '',
  notice: '',
  onBeforeInput() {},
  onPaste() {},
  onChange() {},
  onBlur() {},
};

export { InputType, InputState };
export default Input;
