import { useImperativeHandle, useRef } from 'react';

import { color } from 'assets/styles';
import { Section } from 'components/layouts/section';

import { getIconPath, viewbox } from 'VtWebGuiIcons/src';

import { sectionPaddingBottom, sectionPaddingTop, timeSectionRowGap } from '../calendar.dims';

import { Time } from './time/Time';
import type { TimeHandle } from './time/time.types';
import type { TimeSectionProps } from './timeSection.type';


/**
 * React sub-component of the control component "DateTimePicker".
 */
const TimeSection = ({
  ref, dateTimeFormat, showBackground, dateTimeObj, dateTimeObj2, onChange, onChange2,
  onFocusPrev, onFocusNext,
}: TimeSectionProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const time1Ref = useRef<TimeHandle>(null);
  const time2Ref = useRef<TimeHandle>(null);


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
   * Helper function to derive the total number of elements of a line for the time is the number of
   * the used select boxes plus separator elements between each.
   */
  const getNumOfTimeElements = () => (
    (
      Number(dateTimeFormat.hasHours)
      + Number(dateTimeFormat.hasMinutes)
      + Number(dateTimeFormat.hasSeconds)
      + Number(dateTimeFormat.hourCycle === 'h12')
    ) * 2 - 1
  );


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    focusFirst: () => {
      time1Ref.current?.focusFirst();
    },
    focusLast: () => {
      (time2Ref.current ?? time1Ref.current)?.focusLast();
    },
    handleTabKeyEvent: (event) => {
      time1Ref.current?.handleTabKeyEvent(event);

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

  const svgStyle: React.CSSProperties = {
    position: 'absolute',
    left: (showRange ? '-28px' : '-16px'),
    top: (showRange ? '16px' : '7px'),
    fill: color.offWhite,
  };

  return (
    <Section
      relativePosition
      paddingTop={sectionPaddingTop}
      paddingRight="large"
      paddingBottom={sectionPaddingBottom}
      paddingLeft="large"
      {...(showBackground && {
        backgroundColor: 'lightGray',
      })}
      overflowHidden
    >
      {showBackground && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
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
        gridTemplateColumns={`repeat(${getNumOfTimeElements()}, auto)`}
        rowGap={timeSectionRowGap}
        columnGap="small"
        justifyContent="center"
        alignItems="baseline"
      >
        <Time
          ref={time1Ref}
          dateTimeFormat={dateTimeFormat}
          dateTimeObj={dateTimeObj}
          onChange={onChange}
          {...(onFocusPrev && { onFocusPrev })}
          {...(!showRange && onFocusNext && { onFocusNext })}
        />
        {showRange && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
          <Time
            ref={time2Ref}
            dateTimeFormat={dateTimeFormat}
            dateTimeObj={dateTimeObj2}
            onChange={onChange2}
            {...(onFocusNext && { onFocusNext })}
          />
        )}
      </Section>
    </Section>
  );
  //                                                                                  </editor-fold>
};

TimeSection.displayName = 'TimeSection';


export { TimeSection };
