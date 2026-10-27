import PropTypes from 'prop-types';
import {
  forwardRef, useRef, useImperativeHandle, useCallback,
} from 'react';

import SelectBox from 'components/controls/selectBox';


const hoursOptions = new Array(24).fill(null).map((_, idx) => ({
  value: idx,
  text: idx.toString().padStart(2, '0'),
}));

const minutesSecondsOptions = new Array(60).fill(null).map((_, idx) => ({
  value: idx,
  text: idx.toString().padStart(2, '0'),
}));


/**
 * React component.
 */
const Time = forwardRef(({
  id, withSec, dateTimeObj, onChange, onFocusPrev, onFocusNext,
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const selectBoxFirstRef = useRef();
  const selectBoxLastRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


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
  const handleSelectHour = useCallback((hours) => {
    onChange({ hours });
  }, [onChange]);


  /**
   *
   */
  const handleSelectMinutes = useCallback((minutes) => {
    onChange({ minutes });
  }, [onChange]);


  /**
   *
   */
  const handleSelectSeconds = useCallback((seconds) => {
    onChange({ seconds });
  }, [onChange]);


  useImperativeHandle(ref, () => ({
    focusFirst: () => {
      selectBoxFirstRef.current.focus();
    },
    focusLast: () => {
      selectBoxLastRef.current.focus();
    },
    handleTabKeyEvent: (event) => {
      if (event.shiftKey && onFocusPrev && (event.target.dataset?.id === `selectBoxFirst${id}`)) {
        event.stopPropagation();
        event.preventDefault();
        onFocusPrev();
      } else if (!event.shiftKey && onFocusNext && (event.target.dataset?.id === `selectBoxLast${id}`)) {
        event.stopPropagation();
        event.preventDefault();
        onFocusNext();
      }
    },
  }), [id, onFocusPrev, onFocusNext]);


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
      <SelectBox
        ref={selectBoxFirstRef}
        id={`selectBoxFirst${id}`}
        noSelection
        selectByWheel
        options={hoursOptions}
        value={dateTimeObj.hours}
        onSelect={handleSelectHour}
      />
      <span>:</span>
      <SelectBox
        {...(!withSec && {
          ref: selectBoxLastRef,
          id: `selectBoxLast${id}`,
        })}
        noSelection
        selectByWheel
        options={minutesSecondsOptions}
        value={dateTimeObj.minutes}
        onSelect={handleSelectMinutes}
      />
      {withSec && (
        <>
          <span>:</span>
          <SelectBox
            ref={selectBoxLastRef}
            id={`selectBoxLast${id}`}
            noSelection
            selectByWheel
            options={minutesSecondsOptions}
            value={dateTimeObj.seconds}
            onSelect={handleSelectSeconds}
          />
        </>
      )}
    </>
  );
  //                                                                                  </editor-fold>
});

Time.displayName = 'Time';

Time.propTypes = {
  id: PropTypes.string,
  withSec: PropTypes.bool,
  dateTimeObj: PropTypes.shape({
    hours: PropTypes.number,
    minutes: PropTypes.number,
    seconds: PropTypes.number,
  }),
  onChange: PropTypes.func,
  onFocusPrev: PropTypes.func,
  onFocusNext: PropTypes.func,
};

Time.defaultProps = {
  id: '',
  withSec: false,
  dateTimeObj: {
    hours: null,
    minutes: null,
    seconds: null,
  },
  onChange() {},
  onFocusPrev: null,
  onFocusNext: null,
};

export default Time;
