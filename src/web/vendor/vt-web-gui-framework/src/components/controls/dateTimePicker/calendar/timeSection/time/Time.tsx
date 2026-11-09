import {
  useContext, useId, useImperativeHandle, useRef,
} from 'react';

import { SelectBox, type SelectBoxHandle, type SelectBoxProps } from 'components/controls/selectBox';
import { useI18n } from 'components/hooks/useI18n';

import type { AmPm } from '../../../dateTimePicker.types';
import { InternalValuesContext } from '../../../internalValues.context';
import { convertHoursFromH23 } from '../../../utils/convertHoursFromH23';

import type { TimeProps } from './time.types';


const minutesAndSecondsOptions = new Array(60).fill(null).map((_, idx) => ({
  value: idx,
  text: idx.toString().padStart(2, '0'),
}));


/**
 * React sub-component of the control component "DateTimePicker" to show the select boxes to select
 * the single elements of the time (hours, minutes, seconds, AM/PM) inside the calendar.
 */
const Time = ({
  ref, dateTimeFormat: {
    hasHours, hasMinutes, hasSeconds, hourCycle,
  }, dateTimeObj, onChange, onFocusPrev, onFocusNext,
}: TimeProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = useI18n();

  // The internal hours and AM/PM value is only used at the 12-hour based time format to hold the
  // value if the other one is not set.
  const {
    internalHoursH12, setInternalHoursH12, internalAmPm, setInternalAmPm,
  } = useContext(InternalValuesContext);

  const firstOrOnlySelectBoxRef = useRef<SelectBoxHandle>(null);
  const lastSelectBoxRef = useRef<SelectBoxHandle>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // The HTML IDs of the select boxes the Tab handling below recognizes the event target by, since
  // the handles of the select boxes expose no element.
  const idPrefix = `viwgf_${useId()}`;
  const firstSelectBoxId = `${idPrefix}firstSelectBox`;
  const onlySelectBoxId = `${idPrefix}onlySelectBox`;
  const lastSelectBoxId = `${idPrefix}lastSelectBox`;

  const is12hBasedFormat = (hourCycle === 'h12');

  let amPmOfHours: AmPm | null = null;

  if (dateTimeObj.hours !== null) {
    amPmOfHours = (dateTimeObj.hours < 12) ? 'am' : 'pm';
  }

  // At the 12-hour based format, an hour or an AM/PM value that is not set falls back to the
  // internal one.
  const hours = convertHoursFromH23(dateTimeObj.hours, hourCycle) ?? (is12hBasedFormat ? internalHoursH12 : null);
  const amPm = amPmOfHours ?? (is12hBasedFormat ? internalAmPm : null);

  // The options of the hours and the am/pm select boxes. The hours follow the hour cycle - 1 to 12,
  // or 0 to 23 - and the am/pm texts the language.
  const hoursOptions = new Array((hourCycle === 'h12') ? 12 : 24).fill(null).map((_, idx) => {
    const value = (hourCycle === 'h12') ? idx + 1 : idx;
    return {
      value,
      text: value.toString().padStart(2, '0'),
    };
  });

  const amPmOptions: { value: AmPm; text: string }[] = [
    { value: 'am', text: translateText('VIWGF_AM') },
    { value: 'pm', text: translateText('VIWGF_PM') },
  ];


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    focusFirst: () => {
      firstOrOnlySelectBoxRef.current?.focus();
    },
    focusLast: () => {
      (lastSelectBoxRef.current ?? firstOrOnlySelectBoxRef.current)?.focus();
    },
    handleTabKeyEvent: (event) => {
      if (event.shiftKey && ((event.target as HTMLElement).id === firstSelectBoxId)) {
        event.stopPropagation();
        event.preventDefault();
        onFocusPrev?.();
      } else if (!event.shiftKey && ((event.target as HTMLElement).id === lastSelectBoxId)) {
        event.stopPropagation();
        event.preventDefault();
        onFocusNext?.();
      }
    },
  }), [firstSelectBoxId, lastSelectBoxId, onFocusPrev, onFocusNext]);


  /**
   * Handler for the callback prop "onSelect" of the control component "SelectBox" to calculate and
   * set the 24-based hours value.
   */
  const handleSelectHour: NonNullable<SelectBoxProps<number>['onSelect']> = ({ value }) => {
    if (hourCycle === 'h23') {
      onChange({ hours: value });
    } else if (
      (value === null)
      || ((amPm === 'am') && (value !== 12))
      || ((amPm === 'pm') && (value === 12))
    ) {
      setInternalHoursH12(value);
      onChange({ hours: value });
    } else if (amPm === null) {
      setInternalHoursH12(value);
      onChange({ hours: null });
    } else if ((amPm === 'am') && (value === 12)) {
      setInternalHoursH12(0);
      onChange({ hours: 0 });
    } else {
      setInternalHoursH12(value + 12);
      onChange({ hours: value + 12 });
    }
  };


  /**
   * Handler for the callback prop "onSelect" of the control component "SelectBox" to set the
   * minutes value by the callback prop "onChange".
   */
  const handleSelectMinutes: NonNullable<SelectBoxProps<number>['onSelect']> = ({ value }) => {
    onChange({ minutes: value });
  };


  /**
   * Handler for the callback prop "onSelect" of the control component "SelectBox" to set the
   * seconds value by the callback prop "onChange".
   */
  const handleSelectSeconds: NonNullable<SelectBoxProps<number>['onSelect']> = ({ value }) => {
    onChange({ seconds: value });
  };


  /**
   * Handler for the callback prop "onSelect" of the control component "SelectBox" to set the
   * internal AM/PM value. The resulted 24-based hours value is calculated and returned by the
   * callback prop "onChange".
   */
  const handleSelectAmPm: NonNullable<SelectBoxProps<AmPm>['onSelect']> = ({ value }) => {
    setInternalAmPm(value);

    if (hours !== null) {
      if (value === null) {
        onChange({ hours: null });
      } else if (
        ((value === 'am') && (hours !== 12))
        || ((value === 'pm') && (hours === 12))
      ) {
        onChange({ hours });
      } else if ((value === 'am') && (hours === 12)) {
        onChange({ hours: 0 });
      } else {
        onChange({ hours: hours + 12 });
      }
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <>
      {hasHours && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <SelectBox<number>
          ref={firstOrOnlySelectBoxRef}
          id={(hasMinutes || hasSeconds || is12hBasedFormat) ? firstSelectBoxId : onlySelectBoxId}
          noSelection
          selectByWheel
          options={hoursOptions}
          value={hours}
          onSelect={handleSelectHour}
        />
      )}
      {hasHours && (hasMinutes || hasSeconds) && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <span>:</span>
      )}
      {hasMinutes && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <SelectBox<number>
          {...(!hasHours && {
            ref: firstOrOnlySelectBoxRef,
            id: (hasSeconds || is12hBasedFormat) ? firstSelectBoxId : onlySelectBoxId,
          })}
          {...(hasHours && !hasSeconds && !is12hBasedFormat && {
            ref: lastSelectBoxRef,
            id: lastSelectBoxId,
          })}
          noSelection
          selectByWheel
          options={minutesAndSecondsOptions}
          value={dateTimeObj.minutes}
          onSelect={handleSelectMinutes}
        />
      )}
      {hasMinutes && hasSeconds && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <span>:</span>
      )}
      {hasSeconds && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <SelectBox<number>
          {...(!hasHours && !hasMinutes && {
            ref: firstOrOnlySelectBoxRef,
            id: is12hBasedFormat ? firstSelectBoxId : onlySelectBoxId,
          })}
          {...((hasHours || hasMinutes) && !is12hBasedFormat && {
            ref: lastSelectBoxRef,
            id: lastSelectBoxId,
          })}
          noSelection
          selectByWheel
          options={minutesAndSecondsOptions}
          value={dateTimeObj.seconds}
          onSelect={handleSelectSeconds}
        />
      )}
      {is12hBasedFormat && (hasHours || hasMinutes || hasSeconds) && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <span>&nbsp;</span>
      )}
      {is12hBasedFormat && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <SelectBox<AmPm>
          {...(!hasHours && !hasMinutes && !hasSeconds && { ref: firstOrOnlySelectBoxRef })}
          {...((hasHours || hasMinutes || hasSeconds) && { ref: lastSelectBoxRef })}
          id={lastSelectBoxId}
          noSelection
          selectByWheel
          options={amPmOptions}
          value={amPm}
          onSelect={handleSelectAmPm}
        />
      )}
    </>
  );
  //                                                                                  </editor-fold>
};

Time.displayName = 'Time';


export { Time };
