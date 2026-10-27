import { useContext, useEffect, useRef } from 'react';

import { typo } from 'assets/styles';
import { useI18n } from 'components/hooks/useI18n';
import { classNames } from 'utils/classNames';
import { measureText } from 'utils/measureText';

import type { AmPm } from '../../dateTimePicker.types';
import { InternalValuesContext } from '../../internalValues.context';
import { convertHoursFromH23 } from '../../utils/convertHoursFromH23';

import * as css from './dateTimePart.scss';
import type { DateTimePartProps } from './dateTimePart.types';


/**
 * React sub-component of one part of a date time field - one number of the date or the time, or the
 * am/pm marker - drawn as a read-only input element that takes its value from the keys alone:
 * digits, the arrows, Backspace and Delete, and "a" and "p" for the am/pm part.
 */
const DateTimePart = ({
  ref, id, disable, dateTimeObj, minValue = 0, maxValue = Infinity, numDigits = 1,
  placeholderChar = '-', onChange, onFocusPrev, onFocusNext, onKeyTab,
}: DateTimePartProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = useI18n();

  const {
    internalHoursH12, setInternalHoursH12, internalAmPm, setInternalAmPm,
  } = useContext(InternalValuesContext);

  const isWritingRef = useRef(false);
  const countLeadingZerosRef = useRef(0);
  const writingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let value: number | AmPm | null,
    valueStr: string,
    isPlaceholder: boolean;

  if (id === 'hoursH12') {
    value = convertHoursFromH23(dateTimeObj.hours, 'h12') ?? internalHoursH12;
  } else if (id === 'amPm') {
    if (dateTimeObj.hours === null) {
      value = internalAmPm;
    } else {
      value = (dateTimeObj.hours < 12) ? 'am' : 'pm';
    }
  } else {
    value = dateTimeObj[id];
  }

  if (value === null) {
    valueStr = placeholderChar.repeat(numDigits);
    isPlaceholder = true;
  } else if (id === 'amPm') {
    valueStr = translateText((value === 'am') ? 'VIWGF_AM' : 'VIWGF_PM');
    isPlaceholder = false;
  } else {
    valueStr = value.toString().padStart(numDigits, '0');
    isPlaceholder = false;
  }

  const valueWidth = measureText(valueStr, {
    fontSize: typo.typoSet.value.small.fontSize,
    fontWeight: typo.typoSet.value.small.fontWeight,
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
   * Handler for the synthetic React event "onKeyDown" of the input element. Digits type a value over
   * a window of two seconds, the arrows up and down step it and wrap at its bounds, Backspace and
   * Delete clear it, "a" and "p" set the am/pm part, and a completed value, the arrows left and right
   * and Tab move the focus to the neighbouring part.
   */
  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    const { key } = event;
    let nextValue: number | AmPm | null | undefined,
      focusNextPart = false;

    // ---------------------------------------------------------------------------------------------
    if (/^\d$/.test(key)) {
    // ---------------------------------------------------------------------------------------------

      if (id !== 'amPm') {
        const keyAsNum = parseInt(key, 10);

        if (!value && (keyAsNum === 0)) {
          countLeadingZerosRef.current++;
        }

        const switchValue = Math.floor(maxValue / (10 ** (countLeadingZerosRef.current + 1)));

        if (!isWritingRef.current || (typeof value !== 'number') || (value > switchValue)) {
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
        }, 2000);
      }

    // ---------------------------------------------------------------------------------------------
    } else if (['a', 'p'].includes(key)) {
    // ---------------------------------------------------------------------------------------------

      if (id === 'amPm') {
        event.stopPropagation();
        nextValue = (key === 'a') ? 'am' : 'pm';

        isWritingRef.current = false;
        clearTimeout(writingTimeoutRef.current);
      }

    // ---------------------------------------------------------------------------------------------
    } else if (key === 'Tab') {
    // ---------------------------------------------------------------------------------------------

      isWritingRef.current = false;
      clearTimeout(writingTimeoutRef.current);
      countLeadingZerosRef.current = 0;
      onKeyTab?.({ id, isShiftKey: event.shiftKey });

    // ---------------------------------------------------------------------------------------------
    } else if (key === 'ArrowUp') {
    // ---------------------------------------------------------------------------------------------

      event.stopPropagation();

      if (id === 'amPm') {
        nextValue = (value === 'am') ? 'pm' : 'am';
      } else if (typeof value === 'number') {
        nextValue = ((value >= maxValue)
          ? minValue
          : Math.min(maxValue, value + 1)
        );
      } else {
        nextValue = minValue;
      }

      isWritingRef.current = false;
      clearTimeout(writingTimeoutRef.current);
      countLeadingZerosRef.current = 0;

    // ---------------------------------------------------------------------------------------------
    } else if (key === 'ArrowDown') {
    // ---------------------------------------------------------------------------------------------

      event.stopPropagation();

      if (id === 'amPm') {
        nextValue = (value === 'am') ? 'pm' : 'am';
      } else if (typeof value === 'number') {
        nextValue = ((value <= minValue)
          ? maxValue
          : Math.max(minValue, value - 1)
        );
      } else {
        nextValue = maxValue;
      }

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

      onFocusPrev({ id });

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
        onFocusPrev({ id, clear: true });
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
      if (id === 'hoursH12') {
        const nextHoursH12 = nextValue as number | null;
        let amPm: AmPm | null;

        if (dateTimeObj.hours === null) {
          amPm = internalAmPm;
        } else {
          amPm = (dateTimeObj.hours < 12) ? 'am' : 'pm';
        }

        if (
          (nextHoursH12 === null)
          || ((amPm === 'am') && (nextHoursH12 !== 12))
          || ((amPm === 'pm') && (nextHoursH12 === 12))
        ) {
          setInternalHoursH12(nextHoursH12);
          onChange({ hours: nextHoursH12 });
        } else if (amPm === null) {
          setInternalHoursH12(nextHoursH12);
          onChange({ hours: null });
        } else if ((amPm === 'am') && (nextHoursH12 === 12)) {
          setInternalHoursH12(0);
          onChange({ hours: 0 });
        } else {
          setInternalHoursH12(nextHoursH12 + 12);
          onChange({ hours: nextHoursH12 + 12 });
        }
      } else if (id === 'amPm') {
        const nextAmPm = nextValue as AmPm | null;

        setInternalAmPm(nextAmPm);

        if (dateTimeObj.hours !== null) {
          if (nextAmPm === null) {
            onChange({ hours: null });
          } else if (
            ((nextAmPm === 'am') && (dateTimeObj.hours !== 12))
            || ((nextAmPm === 'pm') && (dateTimeObj.hours === 12))
          ) {
            onChange({ hours: dateTimeObj.hours });
          } else if ((nextAmPm === 'am') && (dateTimeObj.hours === 12)) {
            onChange({ hours: 0 });
          } else {
            onChange({ hours: dateTimeObj.hours + 12 });
          }
        }
      } else {
        onChange({ [id]: nextValue });
      }
    }

    if (focusNextPart) {
      onFocusNext({ id });
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if ((typeof value === 'number') && (value > maxValue)) {
      onChange({ [id]: maxValue });
    }
  }, [id, value, maxValue, onChange]);


  useEffect(() => () => {
    clearTimeout(writingTimeoutRef.current);
  }, []);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const dateTimePartClasses = classNames(css.dateTimePart, {
    [css.disabled]: disable,
    [css.placeholder]: isPlaceholder,
  });

  const dateTimePartStyle = {
    width: `${valueWidth}px`,
  };

  return (
    <input
      ref={ref}
      type="text"
      disabled={disable}
      readOnly
      className={dateTimePartClasses}
      style={dateTimePartStyle}
      {...(!disable && {
        tabIndex: 0,
        onKeyDown: handleKeyDown,
      })}
      value={valueStr}
    />
  );
  //
};

DateTimePart.displayName = 'DateTimePart';


export { DateTimePart };
