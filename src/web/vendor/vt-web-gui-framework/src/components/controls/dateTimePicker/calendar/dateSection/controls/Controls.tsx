import { useImperativeHandle, useRef } from 'react';

import { Button, type ButtonHandle } from 'components/controls/button';
import { SelectBox, type SelectBoxHandle } from 'components/controls/selectBox';
import { useI18n } from 'components/hooks/useI18n';
import { Section } from 'components/layouts/section';

import { sectionPaddingBottom, sectionPaddingTop } from '../../calendar.dims';

import type { ControlsProps } from './controls.type';


/**
 * React sub-component of the control component "DateTimePicker".
 */
const Controls = ({
  ref, selectBoxMonthId, buttonNextMonthId, month, year, onSelectMonth, onSelectYear,
  onDecrementMonth, onIncrementMonth,
}: ControlsProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl, translateText } = useI18n();

  const selectBoxMonthRef = useRef<SelectBoxHandle>(null);
  const buttonPrevMonthRef = useRef<ButtonHandle>(null);
  const buttonNextMonthRef = useRef<ButtonHandle>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  // The options of the two select boxes. The months change with the language, the years with the
  // year shown - five before it, five after.
  const monthOptions = [
    { value: 1, text: translateText('VIWGF_JANUARY_L') },
    { value: 2, text: translateText('VIWGF_FEBRUARY_L') },
    { value: 3, text: translateText('VIWGF_MARCH_L') },
    { value: 4, text: translateText('VIWGF_APRIL_L') },
    { value: 5, text: translateText('VIWGF_MAY_L') },
    { value: 6, text: translateText('VIWGF_JUNE_L') },
    { value: 7, text: translateText('VIWGF_JULY_L') },
    { value: 8, text: translateText('VIWGF_AUGUST_L') },
    { value: 9, text: translateText('VIWGF_SEPTEMBER_L') },
    { value: 10, text: translateText('VIWGF_OCTOBER_L') },
    { value: 11, text: translateText('VIWGF_NOVEMBER_L') },
    { value: 12, text: translateText('VIWGF_DECEMBER_L') },
  ];

  const yearOptions = new Array(11).fill(null).map((_, idx) => {
    const value = year - 5 + idx;
    return { value, text: `${value}` };
  });


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    focusFirstElement: () => {
      requestAnimationFrame(() => {
        selectBoxMonthRef.current?.focus();
      });
    },
    focusButtonPrevMonth: () => {
      requestAnimationFrame(() => {
        buttonPrevMonthRef.current?.focus();
      });
    },
    focusButtonNextMonth: () => {
      requestAnimationFrame(() => {
        buttonNextMonthRef.current?.focus();
      });
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

  // The gap between the three parts is stated, not left to the free space "space-between" hands out:
  // the card is as wide as this header, so there is no free space unless the parts leave some, and
  // since the select boxes carry the pane with its padding they leave none. The two buttons are
  // strung together with "flush" into one body, meeting in the seam of their contact shadows - a
  // pair, and narrower than two.
  return (
    <Section
      gridAutoFlow="column"
      columnGap="small"
      alignContent="center"
      justifyContent="space-between"
      paddingTop={sectionPaddingTop}
      paddingRight="normal"
      paddingBottom={sectionPaddingBottom}
      paddingLeft="normal"
      backgroundColor="primary"
    >
      <SelectBox<number>
        ref={selectBoxMonthRef}
        id={selectBoxMonthId}
        selectByWheel
        options={monthOptions}
        value={month}
        onSelect={onSelectMonth}
      />
      <SelectBox<number>
        selectByWheel
        options={yearOptions}
        value={year}
        onSelect={onSelectYear}
      />
      <Section gridAutoFlow="column">
        <Button
          ref={buttonPrevMonthRef}
          type="tinted"
          flush="end"
          icon={isRtl ? 'NAVIRIGHT' : 'NAVILEFT'}
          onClick={onDecrementMonth}
        />
        <Button
          ref={buttonNextMonthRef}
          id={buttonNextMonthId}
          type="tinted"
          flush="start"
          icon={isRtl ? 'NAVILEFT' : 'NAVIRIGHT'}
          onClick={onIncrementMonth}
        />
      </Section>
    </Section>
  );
  //                                                                                  </editor-fold>
};

Controls.displayName = 'Controls';


export { Controls };
