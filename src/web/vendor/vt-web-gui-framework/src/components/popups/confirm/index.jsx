import PropTypes from 'prop-types';
import {
  memo, useCallback, useEffect,
} from 'react';

import Enums from 'assets/enums';
import Button, { ButtonType, ButtonState, ButtonHighlight } from 'components/controls/button';
import Text from 'components/indicators/text';
import Section from 'components/layouts/section';
import Dialog from 'components/popups/dialog';
import bbCode from 'utils/bbCode';


/**
 * Memoized React component of a confirm dialog uses component Dialog.
 */
const Confirm = memo(({
  id, question, hint, labelButtonCancel, labelButtonOk, onClickCancel, onClickOk,
}) => {
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
   *
   */
  const handleWindowKeyDown = useCallback((event) => {
    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        break;

      case 'Escape':
        event.stopPropagation();
        onClickCancel(id);
        break;

      case 'Enter':
        event.stopPropagation();
        onClickOk(id);
        break;

      // no default
    }
  }, [id, onClickCancel, onClickOk]);


  /**
   *
   */
  const handleClickCancel = useCallback(() => {
    onClickCancel(id);
  }, [id, onClickCancel]);


  /**
   *
   */
  const handleClickOk = useCallback(() => {
    onClickOk(id);
  }, [id, onClickOk]);


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

  if ((question === Confirm.defaultProps.question)) {
    return null;
  }

  return (
    <Dialog
      rowGap={Enums.GapAndPadding.LARGE}
      padding={Enums.GapAndPadding.LARGE}
      backgroundColor={Enums.BackgroundColor.OFF_WHITE}
      exclusive
      dimmedBackground
    >
      <Section rowGap={Enums.GapAndPadding.NORMAL}>
        <Text type={Enums.TextType.VALUE} size={Enums.ValueSize.LARGE}>{bbCode(question)}</Text>
        {hint && <Text type={Enums.TextType.HINT}>{bbCode(hint)}</Text>}
      </Section>
      <Section
        gridAutoFlow={Enums.GridAutoFlow.COLUMN}
        gap={Enums.GapAndPadding.NORMAL}
        justifyContent={Enums.PlaceContent.END}
      >
        <Button
          type={ButtonType.FLAT}
          state={ButtonState.IDLE}
          highlight={ButtonHighlight.ATTENTION}
          text={labelButtonCancel}
          onClick={handleClickCancel}
        />
        <Button
          type={ButtonType.FLAT}
          state={ButtonState.IDLE}
          highlight={ButtonHighlight.ATTENTION}
          text={labelButtonOk}
          onClick={handleClickOk}
        />
      </Section>
    </Dialog>
  );
  //                                                                                  </editor-fold>
});

Confirm.displayName = 'Confirm';

Confirm.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  question: PropTypes.string.isRequired,
  hint: PropTypes.string,
  labelButtonCancel: PropTypes.string,
  labelButtonOk: PropTypes.string,
  onClickCancel: PropTypes.func,
  onClickOk: PropTypes.func,
};

Confirm.defaultProps = {
  id: '',
  hint: '',
  labelButtonCancel: 'Cancel',
  labelButtonOk: 'OK',
  onClickCancel() {},
  onClickOk() {},
};

export default Confirm;
