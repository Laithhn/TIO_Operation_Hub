import { useId, useImperativeHandle, useRef } from 'react';

import { Button, type ButtonHandle } from 'components/controls/button';
import { useI18n } from 'components/hooks/useI18n';
import { Section } from 'components/layouts/section';

import { nowButtonPaddingBottom, nowButtonPaddingTop } from '../calendar.dims';

import type { NowButtonProps } from './nowButton.types';


/**
 * React sub-component of the control component "DateTimePicker".
 */
const NowButton = ({
  ref, showDate, showTime, onClick, onFocusPrev, onFocusNext,
}: NowButtonProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = useI18n();

  const todayNowButtonRef = useRef<ButtonHandle>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // The HTML ID of the button the Tab handling below recognizes the event target by, since the
  // handle of the button exposes no element.
  const todayNowButtonId = `viwgf_${useId()}todayNowButton`;


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
      todayNowButtonRef.current?.focus();
    },
    handleTabKeyEvent: (event) => {
      if ((event.target as HTMLElement).id === todayNowButtonId) {
        event.stopPropagation();
        event.preventDefault();

        if (event.shiftKey) {
          onFocusPrev?.();
        } else {
          onFocusNext?.();
        }
      }
    },
  }), [todayNowButtonId, onFocusPrev, onFocusNext]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <Section
      justifyItems="center"
      paddingTop={nowButtonPaddingTop}
      paddingRight="large"
      paddingBottom={nowButtonPaddingBottom}
      paddingLeft="large"
      {...((showDate !== showTime) && { backgroundColor: 'lightGray' })}
    >
      <Button
        ref={todayNowButtonRef}
        id={todayNowButtonId}
        type="tinted"
        text={translateText((showDate && !showTime) ? 'VIWGF_TODAY' : 'VIWGF_NOW')}
        onClick={onClick}
      />
    </Section>
  );
  //                                                                                  </editor-fold>
};

NowButton.displayName = 'NowButton';


export { NowButton };
