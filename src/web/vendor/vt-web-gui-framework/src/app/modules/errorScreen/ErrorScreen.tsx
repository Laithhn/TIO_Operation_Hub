import { classNames } from 'utils/classNames';

import * as css from './errorScreen.scss';
import type { ErrorScreenProps } from './errorScreen.types';


/**
 * React component of the app module "ErrorScreen" to display a given error.
 */
const ErrorScreen = ({
  title = 'Error', subTitle = '', message = '', fadeOut = false,
}: ErrorScreenProps) => {
  //                                                                                  </editor-fold>
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

  /**
   * Helper function to remove ANSI styles from a given input string.
   */
  const removeAnsi = (input: string) => input.replace(/\u001b\[.*?m/g, '');


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

  const errorScreenClasses = classNames(css.errorScreen, {
    [css.fadeOut]: fadeOut,
  });

  if ((typeof process.env['OPTIONS'] === 'string') && process.env['OPTIONS'].startsWith('1')) {
    return (
      <div className={errorScreenClasses}>
        <h2>Sorry, an error has occured.</h2>
      </div>
    );
  }

  return (
    <div className={errorScreenClasses}>
      <div className={css.column}>
        <h2>{title}</h2>
        {!!subTitle && <p className={css.subTitle}>{subTitle}</p>}
        <p className={css.message}>{removeAnsi(message)}</p>
        <p className={css.version}>{process.env['DESCRIPTION']}</p>
        <p className={css.version}>{`${process.env['PROJECTNAME']}, Version ${process.env['VERSION']}`}</p>
      </div>
    </div>
  );
  //                                                                                  </editor-fold>
};

ErrorScreen.displayName = 'ErrorScreen';


export { ErrorScreen };
