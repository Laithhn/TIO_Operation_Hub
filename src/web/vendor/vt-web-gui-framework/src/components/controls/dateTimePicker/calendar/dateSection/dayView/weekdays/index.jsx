import PropTypes from 'prop-types';
import { memo, useEffect } from 'react';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import Text from 'components/indicators/text';
import { hooks } from 'store';
import measureText from 'utils/measureText';

import dateTimePickerDefines from '../../../../defines';


const headlineLanguageKeys = ['VIWGF_MONDAY_S', 'VIWGF_TUESDAY_S', 'VIWGF_WEDNESDAY_S', 'VIWGF_THURSDAY_S', 'VIWGF_FRIDAY_S', 'VIWGF_SATURDAY_S', 'VIWGF_SUNDAY_S'];


/**
 * Memoized React component to display the weekdays on top of the calendar
 */
const Weekdays = memo(({ onSetDayWidth }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = hooks.useI18n();


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
      dateTimePickerDefines.calendar.dateSection.dayMinWidth - 4,
      ...headlineLanguageKeys.map((key) => measureText(translateText(key), {
        fontSize: defines.typo.typoSet.label.fontSize,
        fontWeight: defines.typo.typoSet.label.fontWeight,
      })),
    ) + 4;

    onSetDayWidth(dayWidth);
  }, [onSetDayWidth, translateText]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    headlineLanguageKeys.map((langKey) => (
      <Text
        key={langKey}
        placeSelf={Enums.PlaceSelfItems.CENTER}
        type={Enums.TextType.LABEL}
        noOverflow
      >
        {translateText(langKey)}
      </Text>
    ))
  );
  //                                                                                  </editor-fold>
});

Weekdays.displayName = 'Weekdays';

Weekdays.propTypes = {
  onSetDayWidth: PropTypes.func,
};

Weekdays.defaultProps = {
  onSetDayWidth() {},
};

export default Weekdays;
