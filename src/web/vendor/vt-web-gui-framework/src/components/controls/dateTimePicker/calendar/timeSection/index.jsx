import PropTypes from 'prop-types';
import { forwardRef, useRef, useImperativeHandle } from 'react';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import Section from 'components/layouts/section';

import dateTimePickerDefines from '../../defines';
import Time from './time';


/**
 * React component of the calendar section to set the time.
 */
const TimeSection = forwardRef(({
  showRange, withSec, showBackground, dateTimeObj, dateTimeObj2, onChange, onChange2,
  onFocusPrev, onFocusNext,
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const time1Ref = useRef();
  const time2Ref = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { viewbox, getIconPath } = useIconsAsync();


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
      time1Ref.current.focusFirst();
    },
    focusLast: () => {
      (time2Ref.current ?? time1Ref.current).focusLast();
    },
    handleTabKeyEvent: (event) => {
      time1Ref.current.handleTabKeyEvent(event);

      if (time2Ref.current) {
        time2Ref.current.handleTabKeyEvent(event);
      }
    },
  }), []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const svgStyle = {
    position: 'absolute',
    left: (showRange ? '-28px' : '-16px'),
    top: (showRange ? '16px' : '7px'),
    fill: defines.color.offWhite,
  };

  return (
    <Section
      relativePosition
      paddingTop={Enums.GapAndPadding.enumValueOf(dateTimePickerDefines.calendar.sectionPaddingTop)}
      paddingRight={Enums.GapAndPadding.LARGE}
      paddingBottom={Enums.GapAndPadding.enumValueOf(dateTimePickerDefines.calendar.sectionPaddingBottom)}
      paddingLeft={Enums.GapAndPadding.LARGE}
      {...(showBackground && {
        backgroundColor: Enums.BackgroundColor.LIGHT_GRAY,
      })}
      overflowHidden
    >
      {showBackground && (
        <svg
          width={showRange ? '80px' : '50px'}
          height={showRange ? '80px' : '50px'}
          viewBox={viewbox}
          style={svgStyle}
        >
          <path d={getIconPath('CLOCK')} />
        </svg>
      )}
      <Section
        gridTemplateColumns={`repeat(${withSec ? 5 : 3}, auto)`}
        rowGap={Enums.GapAndPadding.enumValueOf(dateTimePickerDefines.calendar.timeSection.rowGap)}
        columnGap={Enums.GapAndPadding.SMALL}
        justifyContent={Enums.PlaceContent.CENTER}
        alignItems={Enums.PlaceSelfItems.BASELINE}
      >
        <Time
          ref={time1Ref}
          id="1"
          withSec={withSec}
          dateTimeObj={dateTimeObj}
          onChange={onChange}
          onFocusPrev={onFocusPrev}
          {...(!showRange && {
            onFocusNext,
          })}
        />
        {showRange && (
          <Time
            ref={time2Ref}
            id="2"
            withSec={withSec}
            dateTimeObj={dateTimeObj2}
            onChange={onChange2}
            onFocusNext={onFocusNext}
          />
        )}
      </Section>
    </Section>
  );
  //                                                                                  </editor-fold>
});

TimeSection.displayName = 'TimeSection';

TimeSection.propTypes = {
  showRange: PropTypes.bool,
  withSec: PropTypes.bool,
  showBackground: PropTypes.bool,
  dateTimeObj: PropTypes.shape({
    hours: PropTypes.number,
    minutes: PropTypes.number,
    seconds: PropTypes.number,
  }),
  dateTimeObj2: PropTypes.shape({
    hours: PropTypes.number,
    minutes: PropTypes.number,
    seconds: PropTypes.number,
  }),
  onChange: PropTypes.func,
  onChange2: PropTypes.func,
  onFocusPrev: PropTypes.func,
  onFocusNext: PropTypes.func,
};

TimeSection.defaultProps = {
  showRange: false,
  withSec: false,
  showBackground: false,
  dateTimeObj: {
    hours: null,
    minutes: null,
    seconds: null,
  },
  dateTimeObj2: {
    hours: null,
    minutes: null,
    seconds: null,
  },
  onChange() {},
  onChange2() {},
  onFocusPrev() {},
  onFocusNext() {},
};

export default TimeSection;
