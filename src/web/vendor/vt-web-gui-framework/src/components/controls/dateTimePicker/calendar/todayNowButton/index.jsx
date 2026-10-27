import PropTypes from 'prop-types';
import {
  memo, forwardRef, useRef, useMemo, useImperativeHandle, useCallback, useEffect,
} from 'react';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import Button, { ButtonType, buttonDefines } from 'components/controls/button';

import dateTimePickerDefines from '../../defines';


const overlayedButtonHalfDim = buttonDefines.overlayedButtons.dim / 2;


/**
 * Memoized React component of an overlayed button to set the date and time to today and now.
 */
const TodayNowButton = memo(forwardRef(({
  isRtl, showDate, showTime, showRange, onChange, onChange2, onFocusPrev, onFocusNext,
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const clickStateRef = useRef(0);
  const clickTimeoutRef = useRef();
  const todayNowButtonRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const bottomPos = useMemo(() => {
    const timeSectionRowGap = Enums.GapAndPadding.enumValueOf(dateTimePickerDefines.calendar.timeSection.rowGap).value;
    let pos = Enums.GapAndPadding.enumValueOf(dateTimePickerDefines.calendar.sectionPaddingBottom).value;

    if (showDate) {
      if (showTime) {
        pos += Enums.GapAndPadding.enumValueOf(dateTimePickerDefines.calendar.sectionPaddingBottom).value
          + Enums.GapAndPadding.enumValueOf(dateTimePickerDefines.calendar.sectionPaddingTop).value;

        if (showRange) {
          pos += (defines.layout.controls.heightDefault * 2) + timeSectionRowGap;
        } else {
          pos += defines.layout.controls.heightDefault;
        }
      }

      pos += (dateTimePickerDefines.calendar.dateSection.dayHeight * 5.5);
    } else if (showRange) {
      pos += (defines.layout.controls.heightDefault * 1.5) + timeSectionRowGap;
    } else {
      pos += (defines.layout.controls.heightDefault / 2);
    }

    return pos - overlayedButtonHalfDim;
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
   *
   */
  const handleSetTodayNow = useCallback(() => {
    if (showRange) {
      clearTimeout(clickTimeoutRef.current);

      switch (clickStateRef.current) {
        case 1:
          onChange(null);
          onChange2(Date.now());
          break;

        case 2:
          onChange(Date.now());
          onChange2(Date.now());
          break;

        default:
          onChange(Date.now());
          onChange2(null);
          break;
      }

      clickStateRef.current = (clickStateRef.current + 1) % 3;

      clickTimeoutRef.current = setTimeout(() => {
        clickStateRef.current = 0;
      }, 1000);
    } else {
      onChange(Date.now());
    }
  }, [showRange, onChange, onChange2]);


  useImperativeHandle(ref, () => ({
    focus: () => {
      todayNowButtonRef.current.focus();
    },
    handleTabKeyEvent: (event) => {
      if (event.target.dataset?.id === 'todayNowButton') {
        event.stopPropagation();
        event.preventDefault();

        if (event.shiftKey) {
          onFocusPrev();
        } else {
          onFocusNext();
        }
      }
    },
  }), [onFocusPrev, onFocusNext]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => () => {
    clearTimeout(clickTimeoutRef.current);
  }, []);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <Button
      ref={todayNowButtonRef}
      id="todayNowButton"
      type={ButtonType.OVERLAYED}
      {...{ [isRtl ? 'right' : 'left']: -overlayedButtonHalfDim }}
      bottom={bottomPos}
      icon="TODAY"
      onClick={handleSetTodayNow}
    />
  );
  //                                                                                  </editor-fold>
}));

TodayNowButton.displayName = 'TodayNowButton';

TodayNowButton.propTypes = {
  isRtl: PropTypes.bool,
  showDate: PropTypes.bool,
  showTime: PropTypes.bool,
  showRange: PropTypes.bool,
  onChange: PropTypes.func,
  onChange2: PropTypes.func,
  onFocusPrev: PropTypes.func,
  onFocusNext: PropTypes.func,
};

TodayNowButton.defaultProps = {
  isRtl: false,
  showDate: false,
  showTime: false,
  showRange: false,
  onChange() {},
  onChange2() {},
  onFocusPrev() {},
  onFocusNext() {},
};

export default TodayNowButton;
