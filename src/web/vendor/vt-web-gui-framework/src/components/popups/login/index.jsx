import PropTypes from 'prop-types';
import {
  useState, useRef, useCallback, useEffect,
} from 'react';

import Enums from 'assets/enums';
import Button, { ButtonType, ButtonState, ButtonHighlight } from 'components/controls/button';
import Input, { InputType, InputState } from 'components/controls/input';
import Text from 'components/indicators/text';
import Section from 'components/layouts/section';
import Dialog from 'components/popups/dialog';


/**
 * React component of a default login dialog uses component Dialog.
 */
const Login = ({
  id, title, stateInputUsername, stateInputPassword, stateButtonOk, labelUsername, labelPassword,
  labelButtonCancel, labelButtonOk, noticeUsername, noticePassword, passwordVisibilityToggle,
  onClickCancel, onClickOk, children,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const inputUsernameRef = useRef();
  const buttonOkRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isLabel = !!(labelUsername || labelPassword);


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
        if (!event.shiftKey && (event.target.dataset?.id === 'buttonOk')) {
          event.preventDefault();
          inputUsernameRef.current.focus();
        } else if (event.shiftKey && (event.target.dataset?.id === 'inputUsername')) {
          event.preventDefault();
          buttonOkRef.current.focus();
        }
        break;

      case 'Escape':
        document.activeElement.blur();
        onClickCancel(id);
        break;

      case 'Enter':
        document.activeElement.blur();
        onClickOk(id);
        break;

      // no default
    }
  }, [id, onClickCancel, onClickOk]);


  const handleUsernameInputChange = useCallback((value) => { setUsername(value); }, []);
  const handlePasswordInputChange = useCallback((value) => { setPassword(value); }, []);


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
    onClickOk(id, username, password);
  }, [id, onClickOk, username, password]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    inputUsernameRef.current.focus();
  }, []);

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

  return (
    <Dialog
      rowGap={Enums.GapAndPadding.XL}
      padding={Enums.GapAndPadding.LARGE}
      backgroundColor={Enums.BackgroundColor.OFF_WHITE}
      exclusive
      dimmedBackground
    >
      {title && <Text type={Enums.TextType.TITLE}>{title}</Text>}
      <Section
        gridTemplateColumns={isLabel ? 'auto 300px' : '300px'}
        gridTemplateAreas={isLabel ? '"labelUsername inputUsername" "labelPassword inputPassword"' : '"inputUsername" "inputPassword"'}
        gap={Enums.GapAndPadding.NORMAL}
        alignItems={Enums.PlaceSelfItems.BASELINE}
      >
        {labelUsername && <Text gridArea="labelUsername" type={Enums.TextType.LABEL}>{labelUsername}</Text>}
        <Input
          ref={inputUsernameRef}
          id="inputUsername"
          state={stateInputUsername}
          gridArea="inputUsername"
          value={username}
          notice={noticeUsername}
          onChange={handleUsernameInputChange}
        />
        {labelPassword && <Text gridArea="labelPassword" type={Enums.TextType.LABEL}>{labelPassword}</Text>}
        <Input
          gridArea="inputPassword"
          type={InputType.PASSWORD}
          state={stateInputPassword}
          passwordVisibilityToggle={passwordVisibilityToggle}
          value={password}
          notice={noticePassword}
          onChange={handlePasswordInputChange}
        />
      </Section>
      {children}
      <Section
        gridAutoFlow={Enums.GridAutoFlow.COLUMN}
        columnGap={Enums.GapAndPadding.NORMAL}
        justifyContent={Enums.PlaceContent.END}
      >
        <Button
          type={ButtonType.FLAT}
          highlight={ButtonHighlight.ATTENTION}
          text={labelButtonCancel}
          onClick={handleClickCancel}
        />
        <Button
          ref={buttonOkRef}
          id="buttonOk"
          type={ButtonType.FLAT}
          state={stateButtonOk}
          highlight={ButtonHighlight.ATTENTION}
          text={labelButtonOk}
          onClick={handleClickOk}
        />
      </Section>
    </Dialog>
  );
  //                                                                                  </editor-fold>
};

Login.displayName = 'Login';

Login.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  title: PropTypes.string,
  stateInputUsername: PropTypes.instanceOf(InputState),
  stateInputPassword: PropTypes.instanceOf(InputState),
  stateButtonOk: PropTypes.instanceOf(ButtonState),
  labelUsername: PropTypes.string,
  labelPassword: PropTypes.string,
  labelButtonCancel: PropTypes.string,
  labelButtonOk: PropTypes.string,
  noticeUsername: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  noticePassword: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  passwordVisibilityToggle: PropTypes.bool,
  onClickCancel: PropTypes.func,
  onClickOk: PropTypes.func,
  children: PropTypes.node,
};

Login.defaultProps = {
  id: '',
  title: '',
  stateInputUsername: InputState.IDLE,
  stateInputPassword: InputState.IDLE,
  stateButtonOk: ButtonState.IDLE,
  labelUsername: '',
  labelPassword: '',
  labelButtonCancel: 'Cancel',
  labelButtonOk: 'OK',
  noticeUsername: Input.defaultProps.notice,
  noticePassword: Input.defaultProps.notice,
  passwordVisibilityToggle: false,
  onClickCancel() {},
  onClickOk() {},
  children: null,
};

export default Login;
