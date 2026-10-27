import PropTypes from 'prop-types';
import {
  memo, forwardRef, useRef, useEffect,
} from 'react';

import defines from 'assets/defines';
import classNames from 'utils/classNames';
import measureText from 'utils/measureText';

import dateTimePickerDefines from '../../defines';
import css from './numericPart.scss';


/**
 *
 */
const NumericPart = memo(forwardRef(({
  id, disabled, darkTheme, value, minValue, maxValue, numDigits, placeholderChar, onChange,
  onFocusPrev, onFocusNext, onKeyTab,
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const isWritingRef = useRef(false);
  const countLeadingZerosRef = useRef(0);
  const writingTimeoutRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const valueStr = (value === null)
    ? placeholderChar.repeat(numDigits)
    : value.toString().padStart(numDigits, '0');

  const valueWidth = measureText(valueStr, {
    fontSize: defines.typo.typoSet.value.small.fontSize,
    fontWeight: defines.typo.typoSet.value.small.fontWeight,
  }) + 1;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const handleKeyDown = (event) => {
    const { key } = event;
    let nextValue,
      focusNextPart = false;

    // ---------------------------------------------------------------------------------------------
    if (/^\d$/.test(key)) {
    // ---------------------------------------------------------------------------------------------

      const keyAsNum = parseInt(key, 10);

      if (!value && (keyAsNum === 0)) {
        countLeadingZerosRef.current++;
      }

      const switchValue = Math.floor(maxValue / (10 ** (countLeadingZerosRef.current + 1)));

      if (!isWritingRef.current || (value === null) || (value > switchValue)) {
        nextValue = keyAsNum;
        focusNextPart = (nextValue > switchValue);
      } else if (countLeadingZerosRef.current >= numDigits) {
        nextValue = minValue;
        focusNextPart = true;
      } else {
        nextValue = Math.min(maxValue, (value * 10) + keyAsNum);
        focusNextPart = (nextValue > switchValue);
      }

      isWritingRef.current = true;
      clearTimeout(writingTimeoutRef.current);

      if (focusNextPart) {
        countLeadingZerosRef.current = 0;
      }

      writingTimeoutRef.current = setTimeout(() => {
        isWritingRef.current = false;
        countLeadingZerosRef.current = 0;
      }, dateTimePickerDefines.dateTimePicker.writingTimeoutMs);

    // ---------------------------------------------------------------------------------------------
    } else if (key === 'Tab') {
    // ---------------------------------------------------------------------------------------------

      isWritingRef.current = false;
      clearTimeout(writingTimeoutRef.current);
      countLeadingZerosRef.current = 0;
      onKeyTab(event.shiftKey);

    // ---------------------------------------------------------------------------------------------
    } else if (key === 'ArrowUp') {
    // ---------------------------------------------------------------------------------------------

      event.stopPropagation();
      nextValue = ((value === null) || (value >= maxValue)
        ? minValue
        : Math.min(maxValue, value + 1)
      );

      isWritingRef.current = false;
      clearTimeout(writingTimeoutRef.current);
      countLeadingZerosRef.current = 0;

    // ---------------------------------------------------------------------------------------------
    } else if (key === 'ArrowDown') {
    // ---------------------------------------------------------------------------------------------

      event.stopPropagation();
      nextValue = ((value === null) || (value <= minValue)
        ? maxValue
        : Math.max(minValue, value - 1)
      );

      isWritingRef.current = false;
      clearTimeout(writingTimeoutRef.current);
      countLeadingZerosRef.current = 0;

    // ---------------------------------------------------------------------------------------------
    } else if (key === 'ArrowLeft') {
    // ---------------------------------------------------------------------------------------------

      event.stopPropagation();
      isWritingRef.current = false;
      clearTimeout(writingTimeoutRef.current);
      countLeadingZerosRef.current = 0;

      onFocusPrev(id);

    // ---------------------------------------------------------------------------------------------
    } else if (key === 'ArrowRight') {
    // ---------------------------------------------------------------------------------------------

      event.stopPropagation();
      isWritingRef.current = false;
      clearTimeout(writingTimeoutRef.current);
      countLeadingZerosRef.current = 0;

      focusNextPart = true;

    // ---------------------------------------------------------------------------------------------
    } else if (key === 'Backspace') {
    // ---------------------------------------------------------------------------------------------

      event.preventDefault(); // because backspace is used by browsers to go back to the previous page
      event.stopPropagation();
      nextValue = null;

      isWritingRef.current = false;
      clearTimeout(writingTimeoutRef.current);
      countLeadingZerosRef.current = 0;

      if (value === null) {
        onFocusPrev(id, true);
      }

    // ---------------------------------------------------------------------------------------------
    } else if (key === 'Delete') {
    // ---------------------------------------------------------------------------------------------

      event.stopPropagation();
      nextValue = null;

      isWritingRef.current = false;
      clearTimeout(writingTimeoutRef.current);
      countLeadingZerosRef.current = 0;
    }


    if ((nextValue !== undefined) && (nextValue !== value)) {
      onChange(id, nextValue);
    }

    if (focusNextPart) {
      onFocusNext(id);
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (value > maxValue) {
      onChange(id, maxValue);
    }
  }, [id, value, maxValue, onChange]);


  useEffect(() => () => {
    clearTimeout(writingTimeoutRef.current);
  }, []);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const numericPartClasses = classNames(css.numericPart, {
    [css.disabled]: disabled,
    [css.darkTheme]: darkTheme,
    [css.placeholder]: (value === null),
  });

  const numericPartStyle = {
    width: `${valueWidth}px`,
  };

  return (
    <input
      ref={ref}
      type="text"
      disabled={disabled}
      readOnly
      data-component={NumericPart.displayName}
      className={numericPartClasses}
      style={numericPartStyle}
      {...(!disabled && {
        tabIndex: 0,
        onKeyDown: handleKeyDown,
      })}
      value={valueStr}
    />
  );
  //
}));


NumericPart.displayName = 'NumericPart';

NumericPart.propTypes = {
  id: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  darkTheme: PropTypes.bool,
  value: PropTypes.number,
  minValue: PropTypes.number,
  maxValue: PropTypes.number,
  numDigits: PropTypes.number,
  placeholderChar: PropTypes.string,
  onChange: PropTypes.func,
  onFocusPrev: PropTypes.func,
  onFocusNext: PropTypes.func,
  onKeyTab: PropTypes.func,
};

NumericPart.defaultProps = {
  disabled: false,
  darkTheme: false,
  value: null,
  minValue: 0,
  maxValue: Infinity,
  numDigits: 1,
  placeholderChar: '-',
  onChange() {},
  onFocusPrev() {},
  onFocusNext() {},
  onKeyTab() {},
};

export default NumericPart;
