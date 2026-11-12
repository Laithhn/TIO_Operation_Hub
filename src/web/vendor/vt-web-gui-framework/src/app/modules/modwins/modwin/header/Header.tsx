import { WindowControlButton } from 'app/modules/windowControlButton';
import { useI18n } from 'components/hooks/useI18n';

import * as css from './header.scss';
import type { HeaderProps } from './header.types';


/**
 *
 */
const Header = ({
  title, onPointerDown, onMinimize, onClose,
}: HeaderProps) => {
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


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <div
      className={css.header}
      {...(onPointerDown && { onPointerDown })}
    >
      <div className={css.title}>{translateText(title)}</div>
      <div className={css.buttons}>
        {onMinimize && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
          <WindowControlButton type="minimize" onClick={onMinimize} />
        )}
        {onClose && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
          <WindowControlButton type="close" onClick={onClose} />
        )}
      </div>
    </div>
  );
  //                                                                                  </editor-fold>
};

Header.displayName = 'Header';


export { Header };
