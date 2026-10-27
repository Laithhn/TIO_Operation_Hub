import PropTypes from 'prop-types';
import {
  memo, useRef, useMemo, useCallback, useEffect,
} from 'react';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import { buttonDefines } from 'components/controls/button';
import Card from 'components/popups/card';
import { hooks } from 'store';

import dateTimePickerDefines from '../defines';
import DateSection from './dateSection';
import TimeSection from './timeSection';
import TodayNowButton from './todayNowButton';


/**
 * Memoized React component of a date calendar popup.
 */
const Calendar = memo(({
  dateTimePickerRef, show, showWithFocus, showDate, showTime, showRange, withSec, dateTimeObj,
  dateTimeObj2, onChange, onChange2, onClose,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = hooks.useI18n();

  const dateSectionRef = useRef();
  const timeSectionRef = useRef();
  const todayNowButtonRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const calendarHeight = useMemo(() => {
    let height = 0;

    if (showDate) {
      height += (2 * Enums.GapAndPadding.enumValueOf(dateTimePickerDefines.calendar.sectionPaddingTop).value)
        + (2 * Enums.GapAndPadding.enumValueOf(dateTimePickerDefines.calendar.sectionPaddingBottom).value)
        + defines.layout.controls.heightDefault + 1
        + (7 * dateTimePickerDefines.calendar.dateSection.dayHeight);
    }

    if (showTime) {
      height += Enums.GapAndPadding.enumValueOf(dateTimePickerDefines.calendar.sectionPaddingTop).value
        + Enums.GapAndPadding.enumValueOf(dateTimePickerDefines.calendar.sectionPaddingBottom).value
        + defines.layout.controls.heightDefault;

      if (showRange) {
        height += Enums.GapAndPadding.enumValueOf(dateTimePickerDefines.calendar.timeSection.rowGap).value
          + defines.layout.controls.heightDefault;
      }
    }

    return height;
  }, [showDate, showTime, showRange]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  /**
   * Memoized handler for event "key down" on the calender card.
   */
  const handleKeyDown = useCallback((_, event) => {
    switch (event.key) {
      // -------------------------------------------------------------------------------------------
      case 'Tab':
      // -------------------------------------------------------------------------------------------

        if (dateSectionRef.current) {
          dateSectionRef.current.handleTabKeyEvent(event);
        }

        if (timeSectionRef.current) {
          timeSectionRef.current.handleTabKeyEvent(event);
        }

        todayNowButtonRef.current.handleTabKeyEvent(event);
        break;

      // -------------------------------------------------------------------------------------------
      case 'PageUp':
      // -------------------------------------------------------------------------------------------

        if (dateSectionRef.current) {
          dateSectionRef.current.selectPrevMonth();
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'PageDown':
      // -------------------------------------------------------------------------------------------

        if (dateSectionRef.current) {
          dateSectionRef.current.selectNextMonth();
        }
        break;

      // no default
    }
  }, []);


  /**
   *
   */
  const handleFocusPrevBeforeDateSection = useCallback(() => {
    todayNowButtonRef.current.focus();
  }, []);


  /**
   *
   */
  const handleFocusNextAfterDateSection = useCallback(() => {
    if (timeSectionRef.current) {
      timeSectionRef.current.focusFirst();
    } else {
      todayNowButtonRef.current.focus();
    }
  }, []);


  /**
   *
   */
  const handleFocusPrevBeforeTimeSection = useCallback(() => {
    if (dateSectionRef.current) {
      dateSectionRef.current.focusLast();
    } else {
      todayNowButtonRef.current.focus();
    }
  }, []);


  /**
   *
   */
  const handleFocusNextAfterTimeSection = useCallback(() => {
    todayNowButtonRef.current.focus();
  }, []);


  /**
   *
   */
  const handleFocusPrevBeforeTodayNowButton = useCallback(() => {
    if (timeSectionRef.current) {
      timeSectionRef.current.focusLast();
    } else {
      dateSectionRef.current.focusLast();
    }
  }, []);


  /**
   *
   */
  const handleFocusNextAfterTodayNowButton = useCallback(() => {
    if (dateSectionRef.current) {
      dateSectionRef.current.focusFirst();
    } else {
      timeSectionRef.current.focusFirst();
    }
  }, []);


  /**
   *
   */
  const handleMoveCard = useCallback((cardId, event, isPlacedOutside) => {
    if (isPlacedOutside) {
      onClose(cardId, event);
    }
  }, [onClose]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (showWithFocus) {
      if (showDate) {
        dateSectionRef.current.focusDay();
      } else {
        timeSectionRef.current.focusFirst();
      }
    }
  }, [showWithFocus, showDate, showTime]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <Card
      show={show}
      {...{ [isRtl ? 'right' : 'left']: -buttonDefines.overlayedButtons.dim / 2 }}
      height={calendarHeight}
      anchorElemRef={dateTimePickerRef}
      softAnchor
      smallShadow
      onKeyDown={handleKeyDown}
      onClickBeside={onClose}
      onMoveAnchorElem={handleMoveCard}
    >
      {showDate && (
        <DateSection
          ref={dateSectionRef}
          isRtl={isRtl}
          showRange={showRange}
          dateTimeObj={dateTimeObj}
          dateTimeObj2={dateTimeObj2}
          onChange={onChange}
          onChange2={onChange2}
          onFocusPrev={handleFocusPrevBeforeDateSection}
          onFocusNext={handleFocusNextAfterDateSection}
        />
      )}
      {showTime && (
        <TimeSection
          ref={timeSectionRef}
          showRange={showRange}
          withSec={withSec}
          showBackground={showDate}
          dateTimeObj={dateTimeObj}
          dateTimeObj2={dateTimeObj2}
          onChange={onChange}
          onChange2={onChange2}
          onFocusPrev={handleFocusPrevBeforeTimeSection}
          onFocusNext={handleFocusNextAfterTimeSection}
        />
      )}
      <TodayNowButton
        ref={todayNowButtonRef}
        isRtl={isRtl}
        showDate={showDate}
        showTime={showTime}
        showRange={showRange}
        onChange={onChange}
        onChange2={onChange2}
        onFocusPrev={handleFocusPrevBeforeTodayNowButton}
        onFocusNext={handleFocusNextAfterTodayNowButton}
      />
    </Card>
  );
  //                                                                                  </editor-fold>
});

Calendar.displayName = 'Calendar';

Calendar.propTypes = {
  dateTimePickerRef: PropTypes.object.isRequired,
  show: PropTypes.bool,
  showWithFocus: PropTypes.bool,
  showDate: PropTypes.bool,
  showTime: PropTypes.bool,
  showRange: PropTypes.bool,
  withSec: PropTypes.bool,
  dateTimeObj: PropTypes.shape({
    year: PropTypes.number,
    month: PropTypes.number,
    day: PropTypes.number,
    hours: PropTypes.number,
    minutes: PropTypes.number,
    seconds: PropTypes.number,
  }),
  dateTimeObj2: PropTypes.shape({
    year: PropTypes.number,
    month: PropTypes.number,
    day: PropTypes.number,
    hours: PropTypes.number,
    minutes: PropTypes.number,
    seconds: PropTypes.number,
  }),
  onChange: PropTypes.func,
  onChange2: PropTypes.func,
  onClose: PropTypes.func,
};

Calendar.defaultProps = {
  show: false,
  showWithFocus: false,
  showDate: false,
  showTime: false,
  showRange: false,
  withSec: false,
  dateTimeObj: {
    year: null,
    month: null,
    day: null,
    hours: null,
    minutes: null,
    seconds: null,
  },
  dateTimeObj2: {
    year: null,
    month: null,
    day: null,
    hours: null,
    minutes: null,
    seconds: null,
  },
  onChange() {},
  onChange2() {},
  onClose() {},
};

export default Calendar;
