import {
  useEffect, useImperativeHandle, useRef, useState,
} from 'react';

import { IconForControls } from 'components/helpers/iconForControls';
import { NoticeForControls } from 'components/helpers/noticeForControls';
import { useFadeInOut } from 'components/hooks/useFadeInOut';
import { useI18n } from 'components/hooks/useI18n';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';

import { iconExists } from 'VtWebGuiIcons/src';

import { Calendar } from './calendar/Calendar';
import { DateTimeField } from './dateTimeField/DateTimeField';
import type { DateTimeFieldHandle } from './dateTimeField/dateTimeField.types';
import * as css from './dateTimePicker.scss';
import {
  type AmPm, type DateTimePickerProps, DateTimePickerStatus, dateTimePickerStylingProps,
  type InternalValuesContextData,
} from './dateTimePicker.types';
import { InternalValuesContext } from './internalValues.context';
import { useDateTime } from './useDateTime';
import { checkFormatStr } from './utils/checkFormatStr';


/**
 * React component of a date and / or time picker control element.
 */
const DateTimePicker = ({
  ref, id, type = 'dateTime', freeFormat = '', status = DateTimePickerStatus.IDLE,
  bare = false, flush, withSec = false, justifyValues = 'start',
  deleteButton = false, trailingIcon, nowButton = false, value = null, value2 = null,
  timeZone = null, notice, onChange, onChange2, ...restProps
}: DateTimePickerProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl, translateText } = useI18n();

  // How the user has asked for the calendar - by a click or by a key - or null for not at all. It is
  // a wish, not the answer: whether the calendar shows is derived from it further down, where the
  // control's status is known.
  const [calendarRequest, setCalendarRequest] = useState<'byClick' | 'byKey' | null>(null);
  const [internalHoursH12, setInternalHoursH12] = useState<number | null>(null);
  const [internalAmPm, setInternalAmPm] = useState<AmPm | null>(null);

  const dateTimePickerRef = useRef<HTMLSpanElement>(null);
  const firstFieldRef = useRef<DateTimeFieldHandle>(null);
  const secondFieldRef = useRef<DateTimeFieldHandle>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, dateTimePickerStylingProps);
  let dateTimeFormat, showRange;

  switch (type) {
    case 'dateTime':
    case 'dateTimeRange': {
      const timeFormatStr = withSec ? 'VIWGF_DATETIME_FORMAT_TIME_SEC' : 'VIWGF_DATETIME_FORMAT_TIME';

      dateTimeFormat = checkFormatStr(isRtl
        ? `${translateText(timeFormatStr)}\t${translateText('VIWGF_DATETIME_FORMAT_DATE')}`
        : `${translateText('VIWGF_DATETIME_FORMAT_DATE')}\t${translateText(timeFormatStr)}`);
      showRange = (type === 'dateTimeRange');
      break;
    }

    case 'date':
    case 'dateRange':
      dateTimeFormat = checkFormatStr(translateText('VIWGF_DATETIME_FORMAT_DATE'));
      showRange = (type === 'dateRange');
      break;

    case 'time':
    case 'timeRange':
      dateTimeFormat = checkFormatStr(translateText(withSec ? 'VIWGF_DATETIME_FORMAT_TIME_SEC' : 'VIWGF_DATETIME_FORMAT_TIME'));
      showRange = (type === 'timeRange');
      break;

    case 'free':
    case 'freeRange':
      dateTimeFormat = checkFormatStr(freeFormat);
      showRange = (type === 'freeRange');
      break;

    default:
      dateTimeFormat = checkFormatStr('');
      showRange = false;
      break;
  }

  const isDisabled = (status === DateTimePickerStatus.DISABLED);
  // What the two locking statuses leave: a picker that is idle or that shows an error takes input,
  // the error being a statement about the value rather than about whether it may be entered.
  const enableInput = (status === DateTimePickerStatus.IDLE)
    || (status === DateTimePickerStatus.ERROR);
  const modTrailingIcon = (iconExists(trailingIcon) ? trailingIcon : undefined);
  const showNotice = ((typeof notice === 'string') && (notice !== '')) || (typeof notice === 'number');
  const isOnChange2 = showRange && (typeof onChange2 === 'function');

  // The calendar shows where it was asked for and input can be made - a control that locks while
  // its calendar stands open therefore closes it in the same render, not in an effect one render
  // later, which is what showed an open calendar on a locked control for the length of a frame.
  //
  // The second line is what keeps that closing final: with the wish left standing, a control would
  // open its calendar again by itself the moment it unlocks, and BUSY going back to IDLE is the
  // common case. Setting state straight from the render body is what React asks for here rather
  // than an effect - it discards this pass and renders again before anything reaches the screen.
  if (calendarRequest && !enableInput) {
    setCalendarRequest(null);
  }

  const showCalendar = enableInput ? calendarRequest : null;


  // A format on the 24-hour cycle has no am/pm and no 12-hour value to remember, so both go the
  // moment the format is one. **The comparison is what keeps this from looping:** a state set during
  // render always re-renders the component, React skipping the bail-out it grants an identical value
  // everywhere else, so setting null over null on every pass never ends - which is exactly what it
  // did until 2026-09-02, when the first v4 content mounted a date time picker.
  if ((dateTimeFormat.hourCycle === 'h23') && ((internalHoursH12 !== null) || (internalAmPm !== null))) {
    setInternalHoursH12(null);
    setInternalAmPm(null);
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const getInternalValuesContextData = (): InternalValuesContextData => ({
    internalHoursH12, setInternalHoursH12, internalAmPm, setInternalAmPm,
  });


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    focus: () => {
      firstFieldRef.current?.focusFirst();
    },
    showCalendar: (withFocus) => {
      if (withFocus) {
        setCalendarRequest('byKey');
      } else {
        setCalendarRequest('byClick');
      }
    },
    hideCalendar: () => {
      setCalendarRequest(null);
    },
  }), []);


  const { dateTimeObj, date, setValues } = useDateTime(value, dateTimeFormat.hasSeconds, timeZone);
  const { dateTimeObj: dateTimeObj2, date: date2, setValues: setValues2 } = useDateTime(value2, dateTimeFormat.hasSeconds, timeZone);


  /**
   * Handler for the synthetic React event "onClick" on the pane of the date time picker. A click on
   * a part focuses that part by itself, being a click on an input element; a click anywhere else on
   * the pane - a separator, the empty room - focuses the first part of the first field, unless a
   * part holds the focus already. Either way the calendar opens.
   */
  const handleClick: React.MouseEventHandler<HTMLSpanElement> = (event) => {
    event.stopPropagation();

    if (!dateTimePickerRef.current?.contains(document.activeElement)) {
      firstFieldRef.current?.focusFirst();
    }

    setCalendarRequest('byClick');
  };


  /**
   * Handler for synthetic React event "onKeyDown" on the outer element of the date time picker.
   */
  const handleKeyDown: React.KeyboardEventHandler<HTMLSpanElement> = (event) => {
    switch (event.key) {
      case ' ':
        event.stopPropagation();
        setCalendarRequest('byKey');
        break;

      case 'Escape':
        if (showCalendar) {
          event.stopPropagation();
          setCalendarRequest(null);
          firstFieldRef.current?.focusFirst();
        } else if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        break;

      // no default
    }
  };


  /**
   * Handler for a button to reset the input of all date time fields.
   */
  const handleDelete: NonNullable<React.ComponentProps<typeof IconForControls>['onClick']> = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setValues(null);
    setValues2(null);
  };


  /**
   * Handler to focus the LAST input element of the FIRST date time field.
   */
  const handleFocusFirstField: NonNullable<React.ComponentProps<typeof DateTimeField>['onFocusPrev']> = ({ clear }) => {
    firstFieldRef.current?.focusLast(!!clear);
  };


  /**
   * Handler to focus the FIRST input element of the SECOND date time field.
   */
  const handleFocusSecondField: NonNullable<React.ComponentProps<typeof DateTimeField>['onFocusNext']> = () => {
    secondFieldRef.current?.focusFirst();
  };


  /**
   * Handler to close the calender.
   */
  const handleCloseCalendar = () => {
    setCalendarRequest(null);
  };


  /**
   * Handler for the callback prop "onPressEscape" of the sub-component "Calendar" to close the
   * calendar and give the focus back to the first field, the same as Escape on the pane itself.
   */
  const handlePressEscapeInCalendar = () => {
    setCalendarRequest(null);
    firstFieldRef.current?.focusFirst();
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (showRange && !isOnChange2 && (dateTimeObj.wasSetInternally || dateTimeObj2.wasSetInternally)) {
      onChange?.({
        dateTimeObj, date, dateTimeObj2, date2,
      });
    }
  }, [onChange, dateTimeObj, dateTimeObj2, date, date2, showRange, isOnChange2]);

  useEffect(() => {
    if ((!showRange || isOnChange2) && dateTimeObj.wasSetInternally) {
      onChange?.({ dateTimeObj, date });
    }
  }, [onChange, dateTimeObj, date, showRange, isOnChange2]);

  useEffect(() => {
    if (isOnChange2 && dateTimeObj2.wasSetInternally) {
      onChange2({ dateTimeObj: dateTimeObj2, date: date2 });
    }
  }, [onChange2, dateTimeObj2, date2, isOnChange2]);


  const { visibility } = useFadeInOut({
    show: Boolean(showCalendar) && (dateTimeFormat.hasDate || dateTimeFormat.hasTime),
  });


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  // The pane is the picker's whole face: it holds the date and time fields, it answers the pointer
  // and it states the status, all on this one element. A picker flush on both sides carries both
  // flush classes - there is no third class for it.
  const dateTimePickerClasses = classNames(css.dateTimePicker, {
    [css.bare]: bare,
    [css.flushStart]: (flush === 'start') || (flush === 'both'),
    [css.flushEnd]: (flush === 'end') || (flush === 'both'),
    [css.disabled]: isDisabled,
    [css.busy]: (status === DateTimePickerStatus.BUSY),
    [css.error]: (status === DateTimePickerStatus.ERROR),
  });

  // The value the user entered keeps its own colour whatever the status says: colouring the text
  // somebody is reading costs legibility exactly where it is needed. ERROR speaks through the pane's
  // edge instead.
  const dateTimePickerContrClasses = classNames(css.dateTimePickerContr, {
    [css.typoDisabled]: isDisabled,
  });

  const dateTimePickerContrStyle: React.CSSProperties = {
    justifyContent: justifyValues,
  };

  return (
    <InternalValuesContext.Provider value={getInternalValuesContextData()}>
      <span className={css.dateTimePickerOuterContr} style={outerElemStyle}>
        <span
          ref={dateTimePickerRef}
          {...(id && { id })}
          role="textbox"
          className={dateTimePickerClasses}
          {...(enableInput && {
            onClick: handleClick,
            onKeyDown: handleKeyDown,
          })}
        >
          <span className={dateTimePickerContrClasses} style={dateTimePickerContrStyle}>
            <DateTimeField
              ref={firstFieldRef}
              disable={!enableInput}
              dense={showRange}
              dateTimeFormat={dateTimeFormat}
              dateTimeObj={dateTimeObj}
              onChange={setValues}
              {...(showRange && { onFocusNext: handleFocusSecondField })}
              onBlurFirst={handleCloseCalendar}
              {...(!showRange && { onBlurLast: handleCloseCalendar })}
            />
            {showRange && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
              <>
                <IconForControls disable={isDisabled} icon="REMOVE" />
                <DateTimeField
                  ref={secondFieldRef}
                  disable={!enableInput}
                  dense
                  dateTimeFormat={dateTimeFormat}
                  dateTimeObj={dateTimeObj2}
                  onChange={setValues2}
                  onFocusPrev={handleFocusFirstField}
                  onBlurLast={handleCloseCalendar}
                />
              </>
            )}
          </span>
          {deleteButton && (dateTimeObj.isAnySet || dateTimeObj2.isAnySet) && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
            <IconForControls disable={!enableInput} icon="DELETE" onClick={handleDelete} />
          )}
          {(modTrailingIcon || (status === DateTimePickerStatus.BUSY)) && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
            <IconForControls disable={isDisabled} {...(modTrailingIcon && { icon: modTrailingIcon })} showSpinner={status === DateTimePickerStatus.BUSY} />
          )}
        </span>
        {showNotice && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
          <NoticeForControls disable={isDisabled} notice={notice} isErrorText={(status === DateTimePickerStatus.ERROR)} />
        )}
        {(visibility !== 'hide') && (
          <Calendar
            dateTimePickerRef={dateTimePickerRef}
            show={(visibility === 'fadeIn') || (visibility === 'show')}
            showWithFocus={showCalendar === 'byKey'}
            dateTimeFormat={dateTimeFormat}
            showNowButton={nowButton}
            dateTimeObj={dateTimeObj}
            {...(showRange && { dateTimeObj2, onChange2: setValues2 })}
            onChange={setValues}
            onClose={handleCloseCalendar}
            onPressEscape={handlePressEscapeInCalendar}
          />
        )}
      </span>
    </InternalValuesContext.Provider>
  );
  //                                                                                  </editor-fold>
};

DateTimePicker.displayName = 'DateTimePicker';


export { DateTimePicker };
