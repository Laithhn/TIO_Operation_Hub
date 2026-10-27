import PropTypes from 'prop-types';
import {
  memo, forwardRef, useRef, useMemo, useImperativeHandle, useCallback,
} from 'react';

import { hooks } from 'store';
import { parseDateTime } from 'utils/date';

import formatLib from '../formatLib.json';
import NumericPart from './numericPart';
import Seperator from './seperator';
import css from './dateTimeField.scss';


/**
 * Memoized React component of a date and / or time field.
 */
const DateTimeField = memo(forwardRef(({
  disabled, darkTheme, dense, format, dateTimeObj, onChange, onFocusPrev, onFocusNext, onBlurFirst,
  onBlurLast,
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = hooks.useI18n();

  const allNumericPartsRef = useRef({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // Parse the given format string. At the moment, the following format parts are supported: "Y"
  // (year from 0000 to 9999), "m" (month from 01 to 12), "d" (day from 01 to 31), "H" (hours from
  // 00 to 23), "i" (minutes from 00 to 59) and "s" (seconds from 00 to 59). All other characters
  // are handled as placeholders. Use char \t to add a seperator space. Strings in quotes (") are
  // always handles as seperators, while the quotes are not displayed.
  const { formatArr, allKeys } = useMemo(() => {
    const ret = {
      formatArr: [],
      allKeys: [],
    };
    let sep = '',
      isComment = false;


    const endSep = () => {
      if (sep) {
        ret.formatArr.push(sep);
        sep = '';
      }
    };


    // build the array with all format parts and seperators
    for (let i = 0; i < format.length; i++) {
      const char = format.charAt(i);

      if (char === '"') {
        isComment = !isComment;
      } else if (formatLib[char] && !isComment && !ret.allKeys.includes(formatLib[char].key)) {
        endSep();
        ret.formatArr.push(char);
        ret.allKeys.push(formatLib[char].key);
      } else if (char === '\t') {
        endSep();
        ret.formatArr.push(char);
      } else if ((char === '\\') && (format.charAt(i + 1) === 't')) {
        endSep();
        ret.formatArr.push('\t');
        i++;
      } else {
        sep += char;
      }
    }

    endSep();

    return ret;
  }, [format]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    /**
     * Imperative handle to focus the first numeric part of this data time field by the parent
     * component.
     */
    focusFirst: () => {
      const key = allKeys[0];

      if (key) {
        requestAnimationFrame(() => {
          allNumericPartsRef.current[key].focus();
        });
      }
    },

    /**
     * Imperative handle to focus the last numeric part of this data time field by the parent
     * component. By setting the boolean argument clear to true, the value of this last part is
     * additionally cleared.
     */
    focusLast: (clear) => {
      const key = allKeys[allKeys.length - 1];

      if (key) {
        if (clear) {
          onChange(key, null);
        }

        requestAnimationFrame(() => {
          allNumericPartsRef.current[key].focus();
        });
      }
    },
  }), [allKeys, onChange]);


  /**
   *
   */
  const handlePasteDateTime = (event) => {
    const obj = parseDateTime(event.clipboardData.getData('text/plain'));

    if (obj) {
      onChange(obj);
    }
  };


  /**
   *
   */
  const createRefs = (element, key) => {
    allNumericPartsRef.current[key] = element;
  };


  /**
   *
   */
  const handleFocusPrev = useCallback((key, clear) => {
    const idx = allKeys.indexOf(key);

    if (idx >= 0) {
      if (idx > 0) {
        const prevKey = allKeys[idx - 1];

        if (clear) {
          onChange(prevKey, null);
        }

        allNumericPartsRef.current[prevKey].focus();
      } else {
        onFocusPrev(clear);
      }
    }
  }, [onChange, onFocusPrev, allKeys]);


  /**
   *
   */
  const handleFocusNext = useCallback((key) => {
    const idx = allKeys.indexOf(key);

    if (idx >= 0) {
      if (idx < (allKeys.length - 1)) {
        allNumericPartsRef.current[allKeys[idx + 1]].focus();
      } else {
        onFocusNext();
      }
    }
  }, [onFocusNext, allKeys]);


  /**
   *
   */
  const handleKeyTabFirst = useCallback((isShiftKey) => {
    if (isShiftKey) {
      onBlurFirst();
    }
  }, [onBlurFirst]);


  /**
   *
   */
  const handleKeyTabLast = useCallback((isShiftKey) => {
    if (!isShiftKey) {
      onBlurLast();
    }
  }, [onBlurLast]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <span
      className={css.dateTimeField}
      dir="ltr"
      onPaste={handlePasteDateTime}
    >
      {formatArr.map((part, idx) => {
        if (formatLib[part]) {
          const {
            key, minValue, maxValue, numDigits, translatePhC, phC,
          } = formatLib[part];

          return (
            <NumericPart
              ref={(element) => createRefs(element, key)}
              id={key}
              key={key}
              disabled={disabled}
              darkTheme={darkTheme}
              value={dateTimeObj[key]}
              minValue={minValue}
              maxValue={(key === 'day') ? dateTimeObj.daysOfMonth : maxValue}
              numDigits={numDigits}
              placeholderChar={translatePhC ? translateText(phC) : phC}
              onChange={onChange}
              onFocusPrev={handleFocusPrev}
              onFocusNext={handleFocusNext}
              {...(idx === 0) && { onKeyTab: handleKeyTabFirst }}
              {...(idx >= (formatArr.length - 1)) && { onKeyTab: handleKeyTabLast }}
            />
          );
        }

        return (<Seperator key={idx} dense={dense} value={part} />); // eslint-disable-line react/no-array-index-key
      })}
    </span>
  );
  //                                                                                  </editor-fold>
}));

DateTimeField.displayName = 'DateTimeField';

DateTimeField.propTypes = {
  disabled: PropTypes.bool,
  darkTheme: PropTypes.bool,
  dense: PropTypes.bool,
  format: PropTypes.string,
  dateTimeObj: PropTypes.shape({
    year: PropTypes.number,
    month: PropTypes.number,
    day: PropTypes.number,
    hours: PropTypes.number,
    minutes: PropTypes.number,
    seconds: PropTypes.number,
    daysOfMonth: PropTypes.number,
  }),
  onChange: PropTypes.func,
  onFocusPrev: PropTypes.func,
  onFocusNext: PropTypes.func,
  onBlurFirst: PropTypes.func,
  onBlurLast: PropTypes.func,
};

DateTimeField.defaultProps = {
  disabled: false,
  darkTheme: false,
  dense: false,
  format: '',
  dateTimeObj: {
    year: null,
    month: null,
    day: null,
    hours: null,
    minutes: null,
    seconds: null,
    daysOfMonth: 31,
  },
  onChange() {},
  onFocusPrev() {},
  onFocusNext() {},
  onBlurFirst() {},
  onBlurLast() {},
};

export default DateTimeField;
