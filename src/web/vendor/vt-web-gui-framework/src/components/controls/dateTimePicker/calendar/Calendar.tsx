import { useEffect, useRef } from 'react';

import { getSpaceKeyFromValue, layout, space } from 'assets/styles';
import { Section } from 'components/layouts/section';
import { Card, type CardProps } from 'components/popups/card';

import {
  dayHeight, nowButtonPaddingBottom, nowButtonPaddingTop, sectionPaddingBottom, sectionPaddingTop, timeSectionRowGap,
} from './calendar.dims';
import type { CalendarProps } from './calendar.type';
import { DateSection } from './dateSection/DateSection';
import type { DateSectionHandle } from './dateSection/dateSection.type';
import { NowButton } from './nowButton/NowButton';
import type { NowButtonHandle, NowButtonProps } from './nowButton/nowButton.types';
import { TimeSection } from './timeSection/TimeSection';
import type { TimeSectionHandle } from './timeSection/timeSection.type';


// The rounding every popup world of a control carries, taken from the one place that states it. The
// card takes a spacing key rather than a pixel value, so the value is translated back into its key.
const borderRadiusKey = getSpaceKeyFromValue(layout.controlMenus.borderRadius);


/**
 * React sub-component of the control component "DateTimePicker" for the date and time calendar
 * popup.
 */
const Calendar = ({
  dateTimePickerRef, show = false, showWithFocus = false, dateTimeFormat, showNowButton = false,
  dateTimeObj, dateTimeObj2, onChange, onChange2, onClose, onPressEscape,
}: CalendarProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const dateSectionRef = useRef<DateSectionHandle>(null);
  const timeSectionRef = useRef<TimeSectionHandle>(null);
  const nowButtonRef = useRef<NowButtonHandle>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const showRange = !!dateTimeObj2 && !!onChange2;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to add up the height of the calendar from its sections: the row of controls and
   * the seven rows of the day view with the paddings of their two sections, the row of time select
   * boxes (two in a range) with its paddings, and the now button with its own. Every control in it
   * is exactly controls.heightDefault tall - the pixel this added for the controls row until
   * 2026-09-03 was the bottom line of the select boxes before they carried the pane.
   */
  const deriveCalendarHeight = () => {
    let height = 0;

    if (dateTimeFormat.hasDate) {
      height += (2 * space[sectionPaddingTop])
        + (2 * space[sectionPaddingBottom])
        + layout.controls.heightDefault
        + (7 * dayHeight);
    }

    if (dateTimeFormat.hasTime) {
      height += space[sectionPaddingTop] + space[sectionPaddingBottom] + layout.controls.heightDefault;

      if (showRange) {
        height += space[timeSectionRowGap] + layout.controls.heightDefault;
      }
    }

    if (showNowButton) {
      height += space[nowButtonPaddingTop] + space[nowButtonPaddingBottom] + layout.controls.heightDefault;
    }

    return height;
  };


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the callback prop "onKeyDown" of the popup component "Card".
   *
   * Escape is handed to the date time picker, which closes the calendar and takes the focus back.
   * It is taken here rather than through the card's "onPressEscape", which listens on the window:
   * that listener fires wherever the focus is, and a modal window closed by Escape listens there as
   * well, so both would close at once. Stopping the synthetic event keeps the key from the modal
   * window, the same as the pane's own Escape does. A select box of the calendar with its menu open
   * stops the key itself, so that only its menu closes.
   */
  const handleKeyDown: NonNullable<CardProps['onKeyDown']> = ({ event }) => {
    switch (event.key) {
      // -------------------------------------------------------------------------------------------
      case 'Escape':
      // -------------------------------------------------------------------------------------------

        event.stopPropagation();
        onPressEscape();
        break;

      // -------------------------------------------------------------------------------------------
      case 'Tab':
      // -------------------------------------------------------------------------------------------

        dateSectionRef.current?.handleTabKeyEvent(event);
        timeSectionRef.current?.handleTabKeyEvent(event);
        nowButtonRef.current?.handleTabKeyEvent(event);
        break;

      // -------------------------------------------------------------------------------------------
      case 'PageUp':
      // -------------------------------------------------------------------------------------------

        dateSectionRef.current?.selectPrevMonth();
        break;

      // -------------------------------------------------------------------------------------------
      case 'PageDown':
      // -------------------------------------------------------------------------------------------

        dateSectionRef.current?.selectNextMonth();
        break;

      // no default
    }
  };


  /**
   * Handler for the callback prop "onClickBeside" of the popup component "Card".
   */
  const handleClickBesideCard: NonNullable<CardProps['onClickBeside']> = ({ event }) => {
    if ((event.target instanceof Node) && !dateTimePickerRef.current?.contains(event.target)) {
      onClose();
    }
  };


  /**
   * Handler for the callback prop "onMoveAnchorElem" of the popup component "Card".
   */
  const handleMoveCard: NonNullable<CardProps['onMoveAnchorElem']> = ({ isPlacedOutside }) => {
    if (isPlacedOutside) {
      onClose();
    }
  };


  /**
   * Handler for the callback prop "onClick" of the sub-component "NowButton".
   */
  const handleClickNow: NowButtonProps['onClick'] = () => {
    if (showRange) {
      if (
        (dateTimeObj.year !== null) && (dateTimeObj.month !== null) && (dateTimeObj.day !== null)
        && ((dateTimeObj2.year === null) || (dateTimeObj2.month === null) || (dateTimeObj2.day === null))
      ) {
        onChange2(Date.now());
      } else {
        onChange(Date.now());
        onChange2(null);
      }
    } else {
      onChange(Date.now());
    }
  };


  /**
   * Handler for the callback prop "onFocusPrev" of the date section: Shift+Tab out of its first
   * control wraps the focus around to the now button, the last element of the calendar.
   */
  const handleFocusPrevBeforeDateSection = () => {
    nowButtonRef.current?.focus();
  };


  /**
   * Handler for the callback prop "onFocusNext" of the date section: Tab out of its last day moves
   * the focus on to the time section, or to the now button where there is no time.
   */
  const handleFocusNextAfterDateSection = () => {
    if (timeSectionRef.current) {
      timeSectionRef.current.focusFirst();
    } else {
      nowButtonRef.current?.focus();
    }
  };


  /**
   * Handler for the callback prop "onFocusPrev" of the time section: Shift+Tab out of its first
   * select box moves the focus back to the date section's last day, or to the now button where there
   * is no date.
   */
  const handleFocusPrevBeforeTimeSection = () => {
    if (dateSectionRef.current) {
      dateSectionRef.current.focusLast();
    } else {
      nowButtonRef.current?.focus();
    }
  };


  /**
   * Handler for the callback prop "onFocusNext" of the time section: Tab out of its last select box
   * moves the focus on to the now button.
   */
  const handleFocusNextAfterTimeSection = () => {
    nowButtonRef.current?.focus();
  };


  /**
   * Handler for the callback prop "onFocusPrev" of the now button: Shift+Tab moves the focus back to
   * the last select box of the time, or to the last day where there is no time.
   */
  const handleFocusPrevBeforeTodayNowButton = () => {
    if (timeSectionRef.current) {
      timeSectionRef.current.focusLast();
    } else {
      dateSectionRef.current?.focusLast();
    }
  };


  /**
   * Handler for the callback prop "onFocusNext" of the now button: Tab wraps the focus around to the
   * first control of the date section, or to the first select box of the time where there is no
   * date.
   */
  const handleFocusNextAfterTodayNowButton = () => {
    if (dateSectionRef.current) {
      dateSectionRef.current.focusFirst();
    } else {
      timeSectionRef.current?.focusFirst();
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (showWithFocus) {
      if (dateTimeFormat.hasDate) {
        dateSectionRef.current?.focusDay();
      } else {
        timeSectionRef.current?.focusFirst();
      }
    }
  }, [showWithFocus, dateTimeFormat.hasDate]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <Card
      {...(borderRadiusKey && { borderRadius: borderRadiusKey })}
      show={show}
      top={-layout.controlMenus.spaceToDocument}
      bottom={-layout.controlMenus.spaceToDocument}
      height={deriveCalendarHeight()}
      anchorElemRef={dateTimePickerRef}
      softAnchor
      onKeyDown={handleKeyDown}
      onClickBeside={handleClickBesideCard}
      onMoveAnchorElem={handleMoveCard}
    >
      {/* The sections carry grounds of their own - primary under the controls, lightGray under
          the time - and a ground drawn out to the card's edge would run over its rounding. This one
          element clips them to the same rounding; the card itself cannot, a menu's submenu having to
          reach past its edge. */}
      <Section {...(borderRadiusKey && { borderRadius: borderRadiusKey })} overflowHidden>
        {dateTimeFormat.hasDate && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
          <DateSection
            ref={dateSectionRef}
            dateTimeObj={dateTimeObj}
            {...(showRange && { dateTimeObj2, onChange2 })}
            onChange={onChange}
            onFocusPrev={handleFocusPrevBeforeDateSection}
            onFocusNext={handleFocusNextAfterDateSection}
          />
        )}
        {dateTimeFormat.hasTime && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
          <TimeSection
            ref={timeSectionRef}
            dateTimeFormat={dateTimeFormat}
            showBackground={dateTimeFormat.hasDate}
            dateTimeObj={dateTimeObj}
            {...(showRange && { dateTimeObj2, onChange2 })}
            onChange={onChange}
            onFocusPrev={handleFocusPrevBeforeTimeSection}
            onFocusNext={handleFocusNextAfterTimeSection}
          />
        )}
        {showNowButton && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
          <NowButton
            ref={nowButtonRef}
            showDate={dateTimeFormat.hasDate}
            showTime={dateTimeFormat.hasTime}
            onClick={handleClickNow}
            onFocusPrev={handleFocusPrevBeforeTodayNowButton}
            onFocusNext={handleFocusNextAfterTodayNowButton}
          />
        )}
      </Section>
    </Card>
  );
  //                                                                                  </editor-fold>
};

Calendar.displayName = 'Calendar';


export { Calendar };
