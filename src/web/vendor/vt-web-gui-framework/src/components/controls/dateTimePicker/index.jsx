import PropTypes from 'prop-types';
import {
  memo, forwardRef, useState, useRef, useMemo, useImperativeHandle, useCallback, useEffect,
} from 'react';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import IconForControls from 'components/helpers/iconForControls';
import NoticeForControls from 'components/helpers/noticeForControls';
import useFadeInOut from 'components/hooks/useFadeInOut';
import useStylingProps from 'components/hooks/useStylingProps';
import { hooks } from 'store';
import classNames from 'utils/classNames';

import Calendar from './calendar';
import DateTimeField from './dateTimeField';
import css from './dateTimePicker.scss';
import dateTimePickerDefines from './defines';
import { DateTimePickerState, DateTimePickerType } from './enums';
import stylingProps from './stylingProps';
import useDateTime from './useDateTime';


const noticeBottomPx = (
  ((defines.layout.controls.heightDefault - dateTimePickerDefines.dateTimePicker.innerHeight) / -2)
  - defines.layout.controls.noticeHeight
);


/**
 * Memoized React component of a date and / or time picker control element.
 */
const DateTimePicker = memo(forwardRef(({
  id, htmlId, type, freeFormat, state, darkTheme, noLine, withBackground, withSec, justifyValues,
  deleteButton, trailingIcon, value, value2, timeZone, notice, onChange, onChange2, ...restProps
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl, translateText } = hooks.useI18n();

  const [showCalendar, setShowCalendar] = useState(null);

  const dateTimePickerRef = useRef();
  const firstFieldRef = useRef();
  const secondFieldRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { iconExists } = useIconsAsync();
  const { outerElemStyle } = useStylingProps(restProps, stylingProps);

  const {
    format, showRange, showCalenderDate, showCalenderTime,
  } = useMemo(() => {
    switch (type) {
      case DateTimePickerType.DATE_TIME:
      case DateTimePickerType.DATE_TIME_RANGE: {
        const timeFormat = withSec ? 'VIWGF_DATETIME_FORMAT_TIME_SEC' : 'VIWGF_DATETIME_FORMAT_TIME';

        return {
          format: isRtl
            ? `${translateText(timeFormat)}\t${translateText('VIWGF_DATETIME_FORMAT_DATE')}`
            : `${translateText('VIWGF_DATETIME_FORMAT_DATE')}\t${translateText(timeFormat)}`,
          showRange: (type === DateTimePickerType.DATE_TIME_RANGE),
          showCalenderDate: true,
          showCalenderTime: true,
        };
      }

      case DateTimePickerType.DATE:
      case DateTimePickerType.DATE_RANGE:
        return {
          format: translateText('VIWGF_DATETIME_FORMAT_DATE'),
          showRange: (type === DateTimePickerType.DATE_RANGE),
          showCalenderDate: true,
          showCalenderTime: false,
        };

      case DateTimePickerType.TIME:
      case DateTimePickerType.TIME_RANGE:
        return {
          format: translateText(withSec ? 'VIWGF_DATETIME_FORMAT_TIME_SEC' : 'VIWGF_DATETIME_FORMAT_TIME'),
          showRange: (type === DateTimePickerType.TIME_RANGE),
          showCalenderDate: false,
          showCalenderTime: true,
        };

      case DateTimePickerType.FREE:
      case DateTimePickerType.FREE_RANGE:
        return {
          format: freeFormat,
          showRange: (type === DateTimePickerType.FREE_RANGE),
          showCalenderDate: true,
          showCalenderTime: true,
        };

      default:
        return {
          format: '',
          showRange: false,
          showCalenderDate: false,
          showCalenderTime: false,
        };
    }
  }, [type, freeFormat, withSec, isRtl, translateText]);


  const enableInput = (state === DateTimePickerState.IDLE) || (state === DateTimePickerState.ERROR);
  const modTrailingIcon = (iconExists(trailingIcon) ? trailingIcon : '');
  const showNotice = ((typeof notice === 'string') && (notice !== '')) || (typeof notice === 'number');
  const isOnChange2 = showRange && (typeof onChange2 === 'function');


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    focus: () => {
      firstFieldRef.current.focusFirst();
    },
    showCalendar: (withFocus) => {
      if (withFocus) {
        setShowCalendar('byKey');
      } else {
        setShowCalendar('byClick');
      }
    },
    hideCalendar: () => {
      setShowCalendar(null);
    },
  }), []);


  const { dateTimeObj, date, setValues } = useDateTime(value, withSec, timeZone);
  const { dateTimeObj: dateTimeObj2, date: date2, setValues: setValues2 } = useDateTime(value2, withSec, timeZone);


  /**
   * Handler for synthetic React event "onClick" on the outer element of the date time picker. This
   * event is responsible for setting the focus. The default behaviour is prevented and replaced by
   * the following logic:
   * 1) If an input element (see component NumericPart) is clicked, focus it.
   * 2) If an other element is clicked, e.g. a seperator, an icon or only the date time picker, and
   *    no input element of the date time picker has the focus, then focus the first input element
   *    of the first date time field.
   * 3) Always show the calender.
   */
  const handleClick = (event) => {
    event.stopPropagation();

    if (event.target.dataset.component === 'NumericPart') {
      event.target.focus();
    } else if (!dateTimePickerRef.current.contains(document.activeElement)) {
      firstFieldRef.current.focusFirst();
    }

    setShowCalendar('byClick');
  };


  /**
   * Handler for synthetic React event "onKeyDown" on the outer element of the date time picker.
   */
  const handleKeyDown = (event) => {
    switch (event.key) {
      case ' ':
        event.stopPropagation();
        setShowCalendar('byKey');
        break;

      case 'Escape':
        if (showCalendar) {
          event.stopPropagation();
          setShowCalendar(null);
          firstFieldRef.current.focusFirst();
        } else {
          document.activeElement?.blur();
        }
        break;

      // no default
    }
  };


  /**
   * Memoized handler for a button to reset the input of all date time fields.
   */
  const handleDelete = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();

    setValues(null);
    setValues2(null);
  }, [setValues, setValues2]);


  /**
   * Memoized handler to focus the LAST input element of the FIRST date time field.
   */
  const handleFocusFirstField = useCallback((clear) => {
    firstFieldRef.current.focusLast(clear);
  }, []);


  /**
   * Memoized handler to focus the FIRST input element of the SECOND date time field.
   */
  const handleFocusSecondField = useCallback(() => {
    secondFieldRef.current.focusFirst();
  }, []);


  /**
   * Memoized handler to close the calender.
   */
  const handleCloseCalendar = useCallback((_, event) => {
    if (!dateTimePickerRef.current.contains(event?.target)) {
      setShowCalendar(null);
    }
  }, []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (showRange && !isOnChange2 && (dateTimeObj.wasSetInternally || dateTimeObj2.wasSetInternally)) {
      onChange(id, dateTimeObj, date, dateTimeObj2, date2);
    }
  }, [id, onChange, dateTimeObj, dateTimeObj2, date, date2, showRange, isOnChange2]);

  useEffect(() => {
    if ((!showRange || isOnChange2) && dateTimeObj.wasSetInternally) {
      onChange(id, dateTimeObj, date);
    }
  }, [id, onChange, dateTimeObj, date, showRange, isOnChange2]);

  useEffect(() => {
    if (isOnChange2 && dateTimeObj2.wasSetInternally) {
      onChange2(id, dateTimeObj2, date2);
    }
  }, [id, onChange2, dateTimeObj2, date2, isOnChange2]);


  // Effect to check the changes of some conditions during showing the calender.
  useEffect(() => {
    setShowCalendar((prevValue) => ((prevValue && !enableInput) ? null : prevValue));
  }, [enableInput]);


  const { visibilityState } = useFadeInOut(showCalendar && (showCalenderDate || showCalenderTime));


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const dateTimePickerClasses = classNames(css.dateTimePicker, {
    [css.disabled]: (state === DateTimePickerState.DISABLED),
    [css.inactive]: (state === DateTimePickerState.BUSY),
    [css.error]: (state === DateTimePickerState.ERROR),
    [css.noLine]: noLine,
    [css.withBackground]: withBackground,
    [css.darkTheme]: darkTheme,
    [css.showNotice]: showNotice,
  });

  const dateTimePickerContrClasses = classNames(css.dateTimePickerContr, {
    [css.typoDisabled]: (state === DateTimePickerState.DISABLED),
    [css.typoDarkTheme]: darkTheme,
  });

  const dateTimePickerContrStyle = {
    justifyContent: justifyValues.cssValue,
  };

  return (
    <span
      {...((process.env.NODE_ENV === 'development') && { id: htmlId })}
      ref={dateTimePickerRef}
      role="textbox"
      className={dateTimePickerClasses}
      style={outerElemStyle}
      data-id={id}
      {...(enableInput && {
        onClick: handleClick,
        onKeyDown: handleKeyDown,
      })}
    >
      <span
        className={dateTimePickerContrClasses}
        style={dateTimePickerContrStyle}
      >
        <DateTimeField
          ref={firstFieldRef}
          disabled={!enableInput}
          darkTheme={darkTheme}
          dense={showRange}
          format={format}
          dateTimeObj={dateTimeObj}
          onChange={setValues}
          {...(showRange && { onFocusNext: handleFocusSecondField })}
          onBlurFirst={handleCloseCalendar}
          {...(!showRange && { onBlurLast: handleCloseCalendar })}
        />
        {showRange && (
          <>
            <IconForControls
              darkTheme={darkTheme}
              disabled={state === DateTimePickerState.DISABLED}
              icon="REMOVE"
            />
            <DateTimeField
              ref={secondFieldRef}
              disabled={!enableInput}
              darkTheme={darkTheme}
              dense
              format={format}
              dateTimeObj={dateTimeObj2}
              onChange={setValues2}
              onFocusPrev={handleFocusFirstField}
              onBlurLast={handleCloseCalendar}
            />
          </>
        )}
      </span>
      {deleteButton && (dateTimeObj.isAnySet || dateTimeObj2.isAnySet) && (
        <IconForControls
          darkTheme={darkTheme}
          disabled={!enableInput}
          icon="DELETE"
          onClick={handleDelete}
        />
      )}
      {(modTrailingIcon || (state === DateTimePickerState.BUSY)) && (
        <IconForControls
          darkTheme={darkTheme}
          disabled={state === DateTimePickerState.DISABLED}
          icon={modTrailingIcon}
          showSpinner={state === DateTimePickerState.BUSY}
        />
      )}
      {showNotice && (
        <NoticeForControls
          right={withBackground ? 3 : 0}
          bottom={noticeBottomPx}
          left={withBackground ? 3 : 0}
          darkTheme={darkTheme}
          disabled={state === DateTimePickerState.DISABLED}
          notice={notice}
          isErrorText={state === DateTimePickerState.ERROR}
        />
      )}
      {(visibilityState !== Enums.Visibility.HIDE) && (
        <Calendar
          dateTimePickerRef={dateTimePickerRef}
          show={(visibilityState === Enums.Visibility.FADE_IN) || (visibilityState === Enums.Visibility.SHOW)}
          showWithFocus={showCalendar === 'byKey'}
          showDate={showCalenderDate}
          showTime={showCalenderTime}
          showRange={showRange}
          withSec={withSec}
          dateTimeObj={dateTimeObj}
          dateTimeObj2={dateTimeObj2}
          onChange={setValues}
          onChange2={setValues2}
          onClose={handleCloseCalendar}
        />
      )}
    </span>
  );
  //                                                                                  </editor-fold>
}));

DateTimePicker.displayName = 'DateTimePicker';

DateTimePicker.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  htmlId: PropTypes.string,
  type: PropTypes.instanceOf(DateTimePickerType),
  freeFormat: PropTypes.string,
  state: PropTypes.instanceOf(DateTimePickerState),
  darkTheme: PropTypes.bool,
  noLine: PropTypes.bool,
  withBackground: PropTypes.bool,
  withSec: PropTypes.bool,
  justifyValues: PropTypes.oneOf([Enums.PlaceContent.START, Enums.PlaceContent.END, Enums.PlaceContent.CENTER, Enums.PlaceContent.SPACE_BETWEEN]),
  deleteButton: PropTypes.bool,
  trailingIcon: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.object, PropTypes.string]),
  value2: PropTypes.oneOfType([PropTypes.number, PropTypes.object, PropTypes.string]),
  timeZone: PropTypes.string,
  notice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  onChange2: PropTypes.func,
};

DateTimePicker.defaultProps = {
  id: '',
  htmlId: null,
  type: DateTimePickerType.DATE_TIME,
  freeFormat: '',
  state: DateTimePickerState.IDLE,
  darkTheme: false,
  noLine: false,
  withBackground: false,
  withSec: false,
  justifyValues: Enums.PlaceContent.START,
  deleteButton: false,
  trailingIcon: '',
  value: null,
  value2: null,
  timeZone: null,
  notice: '',
  onChange() {},
  onChange2: null,
};

export { DateTimePickerType, DateTimePickerState };
export default DateTimePicker;
