import PropTypes from 'prop-types';
import { memo, useCallback, useEffect } from 'react';

import Enums from 'assets/enums';
import Button, { ButtonType, ButtonHighlight } from 'components/controls/button';
import Text from 'components/indicators/text';
import Section from 'components/layouts/section';
import Dialog from 'components/popups/dialog';
import bbCode from 'utils/bbCode';


/**
 * Memoized React component of alert dialog uses component Dialog.
 */
const Alert = memo(({
  id, text, hint, labelButtonOk, onClickOk,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const showButton = (typeof onClickOk === 'function') && (typeof labelButtonOk === 'string') && (labelButtonOk !== '');


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

      case 'Enter':
        document.activeElement.blur();
        onClickOk(id);
        break;

      // no default
    }
  }, [id, onClickOk]);


  /**
   *
   */
  const handleClickOk = () => {
    onClickOk(id);
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

  if (text === Alert.defaultProps.text) {
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
        <Text type={Enums.TextType.VALUE} size={Enums.ValueSize.LARGE}>{bbCode(text)}</Text>
        {hint && <Text type={Enums.TextType.HINT}>{bbCode(hint)}</Text>}
      </Section>
      {showButton && (
        <Button
          justifySelf={Enums.PlaceSelfItems.END}
          type={ButtonType.FLAT}
          highlight={ButtonHighlight.ATTENTION}
          text={labelButtonOk}
          onClick={handleClickOk}
        />
      )}
    </Dialog>
  );
  //                                                                                  </editor-fold>
});

Alert.displayName = 'Alert';

Alert.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  text: PropTypes.string.isRequired,
  hint: PropTypes.string,
  labelButtonOk: PropTypes.string,
  onClickOk: PropTypes.func,
};

Alert.defaultProps = {
  id: '',
  hint: '',
  labelButtonOk: 'OK',
  onClickOk: null,
};

export default Alert;
