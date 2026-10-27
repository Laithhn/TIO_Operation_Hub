import { useEffect } from 'react';

import { typo } from 'assets/styles';
import { useI18n } from 'components/hooks/useI18n';
import { Text } from 'components/indicators/text';
import { measureText } from 'utils/measureText';

import { dayMinWidth } from '../../../calendar.dims';

import type { WeekdaysProps } from './weekdays.types';


const headlineLanguageKeys = ['VIWGF_MONDAY_S', 'VIWGF_TUESDAY_S', 'VIWGF_WEDNESDAY_S', 'VIWGF_THURSDAY_S', 'VIWGF_FRIDAY_S', 'VIWGF_SATURDAY_S', 'VIWGF_SUNDAY_S'];


/**
 * React sub-component of the control component "DateTimePicker" to display the weekdays on top of
 * the calendar
 */
const Weekdays = ({ onSetDayWidth }: WeekdaysProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = useI18n();


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


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    const dayWidth = Math.max(
      dayMinWidth - 4,
      ...headlineLanguageKeys.map((key) => measureText(translateText(key), {
        fontSize: typo.typoSet.label.fontSize,
        fontWeight: typo.typoSet.label.fontWeight,
      })),
    ) + 4;

    onSetDayWidth({ dayWidth });
  }, [onSetDayWidth, translateText]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    headlineLanguageKeys.map((langKey) => (
      <Text
        key={langKey}
        placeSelf="center"
        textOverflowEllipsis
        type="label"
      >
        {translateText(langKey)}
      </Text>
    ))
  );
  //                                                                                  </editor-fold>
};

Weekdays.displayName = 'Weekdays';


export { Weekdays };
