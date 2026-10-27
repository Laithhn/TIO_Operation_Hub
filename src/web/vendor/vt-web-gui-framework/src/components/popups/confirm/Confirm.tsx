import { useCallback, useEffect } from 'react';

import { Button, type ButtonProps, ButtonStatus } from 'components/controls/button';
import { Text } from 'components/indicators/text';
import { Section } from 'components/layouts/section';
import { Dialog } from 'components/popups/dialog';
import { bbCode } from 'utils/bbCode';
import { isNonEmptyString } from 'utils/type';

import type { ConfirmProps } from './confirm.types';


/**
 * React component of the popup component "Confirm", an confirmtion dialog based on popup component
 * "Dialog".
 */
const Confirm = ({
  id, question, hint = '', labelButtonCancel = 'Cancel', labelButtonOk = 'OK', onClickCancel,
  onClickOk,
}: ConfirmProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


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
   * Handler for the native event "keydown" of the window element.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const handleWindowKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        break;

      case 'Escape':
        event.stopPropagation();
        onClickCancel?.({ event });
        break;

      case 'Enter':
        event.stopPropagation();
        onClickOk?.({ event });
        break;

      // no default
    }
  }, [onClickCancel, onClickOk]);


  /**
   * Handler for the callback prop "onClick" of the control component "Button" for
   * rejecting.
   */
  const handleClickCancel: NonNullable<ButtonProps['onClick']> = ({ event }) => {
    onClickCancel?.({ event });
  };


  /**
   * Handler for the callback prop "onClick" of the control component "Button" for
   * confiming.
   */
  const handleClickOk: NonNullable<ButtonProps['onClick']> = ({ event }) => {
    onClickOk?.({ event });
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    window.addEventListener('keydown', handleWindowKeyDown);

    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [handleWindowKeyDown]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!isNonEmptyString(question)) {
    return null;
  }

  return (
    <Dialog
      rowGap="large"
      padding="normal"
      {...(id && { id })}
      exclusive
      dimmedBackground
    >
      <Section maxWidth="textColumn" rowGap="normal">
        <Text type="value" size="large">{bbCode(question)}</Text>
        {!!hint && <Text type="hint">{bbCode(hint)}</Text>}
      </Section>
      <Section gridAutoFlow="column" gap="normal" justifyContent="end">
        <Button
          type="tinted"
          status={ButtonStatus.IDLE}
          text={labelButtonCancel}
          onClick={handleClickCancel}
        />
        <Button
          type="tinted"
          status={ButtonStatus.IDLE}
          highlight="attention"
          text={labelButtonOk}
          onClick={handleClickOk}
        />
      </Section>
    </Dialog>
  );
  //                                                                                  </editor-fold>
};

Confirm.displayName = 'Confirm';


export { Confirm };
