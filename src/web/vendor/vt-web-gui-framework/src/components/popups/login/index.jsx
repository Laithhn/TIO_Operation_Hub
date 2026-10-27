import {
  useState, useRef, useCallback, useEffect,
} from 'react';

import { Button, ButtonStatus } from 'components/controls/button';
import { Input } from 'components/controls/input';
import Text from 'components/indicators/text';
import Section from 'components/layouts/section';
import Dialog from 'components/popups/dialog';


//Login.propTypes = {
//  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
//  title: PropTypes.string,
//  stateInputUsername: PropTypes.instanceOf(InputState),
//  stateInputPassword: PropTypes.instanceOf(InputState),
//  stateButtonOk: PropTypes.instanceOf(ButtonState),
//  labelUsername: PropTypes.string,
//  labelPassword: PropTypes.string,
//  labelButtonCancel: PropTypes.string,
//  labelButtonOk: PropTypes.string,
//  noticeUsername: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
//  noticePassword: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
//  passwordVisibilityToggle: PropTypes.bool,
//  onClickCancel: PropTypes.func,
//  onClickOk: PropTypes.func,
//  children: PropTypes.node,
//};

/**
 * React component of a default login dialog uses component Dialog.
 */
const Login = ({
  id = '',
  title = '',
  stateInputUsername = "IDLE",
  stateInputPassword = "IDLE",
  stateButtonOk = ButtonStatus.IDLE,
  labelUsername = '',
  labelPassword = '',
  labelButtonCancel = 'Cancel',
  labelButtonOk = 'OK',
  noticeUsername = '',
  noticePassword = '',
  passwordVisibilityToggle = false,
  onClickCancel = () => {},
  onClickOk = () => {},
  children = null,
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
      rowGap="xl"
      padding="large"
      backgroundColor="offWhite"
      exclusive
      dimmedBackground
    >
      {title && <Text type="title">{title}</Text>}
      <Section
        gridTemplateColumns={isLabel ? 'auto 300px' : '300px'}
        gridTemplateAreas={isLabel ? '"labelUsername inputUsername" "labelPassword inputPassword"' : '"inputUsername" "inputPassword"'}
        gap="normal"
        alignItems="baseline"
      >
        {labelUsername && <Text gridArea="labelUsername" type="label">{labelUsername}</Text>}
        <Input
          ref={inputUsernameRef}
          id="inputUsername"
          state={stateInputUsername}
          gridArea="inputUsername"
          value={username}
          notice={noticeUsername}
          onChange={handleUsernameInputChange}
        />
        {labelPassword && <Text gridArea="labelPassword" type="label">{labelPassword}</Text>}
        <Input
          gridArea="inputPassword"
          type="password"
          state={stateInputPassword}
          passwordVisibilityToggle={passwordVisibilityToggle}
          value={password}
          notice={noticePassword}
          onChange={handlePasswordInputChange}
        />
      </Section>
      {children}
      <Section
        gridAutoFlow="column"
        columnGap="normal"
        justifyContent="end"
      >
        <Button
          type="flat"
          text={labelButtonCancel}
          onClick={handleClickCancel}
        />
        <Button
          ref={buttonOkRef}
          id="buttonOk"
          type="flat"
          state={stateButtonOk}
          highlight="attention"
          text={labelButtonOk}
          onClick={handleClickOk}
        />
      </Section>
    </Dialog>
  );
  //                                                                                  </editor-fold>
};

Login.displayName = 'Login';

export default Login;
