import { useCallback, useEffect } from 'react';

import { Button, type ButtonProps } from 'components/controls/button';
import { Text } from 'components/indicators/text';
import { Section } from 'components/layouts/section';
import { Dialog } from 'components/popups/dialog';
import { bbCode } from 'utils/bbCode';
import { isNonEmptyString } from 'utils/type';

import type { AlertProps } from './alert.types';


/**
 * React component of the popup component "Alert", an alert dialog based on popup component
 * "Dialog".
 */
const Alert = ({
  id, text, hint = '', labelButtonOk = 'OK', onClickOk,
}: AlertProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isButton = (typeof onClickOk === 'function') && isNonEmptyString(labelButtonOk);


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

      case 'Enter':
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        onClickOk?.({ event });
        break;

      // no default
    }
  }, [onClickOk]);


  /**
   * Handler for the callback prop "onClick" of the control component "Button"
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

  if (!isNonEmptyString(text)) {
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
        <Text type="value" size="large">{bbCode(text)}</Text>
        {!!hint && <Text type="hint">{bbCode(hint)}</Text>}
      </Section>
      {/* eslint-disable-next-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908 */}
      {isButton && (
        <Button
          justifySelf="end"
          type="tinted"
          highlight="attention"
          text={labelButtonOk}
          onClick={handleClickOk}
        />
      )}
    </Dialog>
  );
  //                                                                                  </editor-fold>
};

Alert.displayName = 'Alert';


export { Alert };
