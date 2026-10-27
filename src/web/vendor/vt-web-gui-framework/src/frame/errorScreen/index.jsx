import PropTypes from 'prop-types';

import classNames from 'utils/classNames';

import css from './errorScreen.scss';

const AnsiParser = require('ansi-parser');


/**
 * Functional presentational React component to display an error.
 */
const ErrorScreen = ({
  title, subTitle, message, fileName, lineNumber, fadeOut,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let msg = message;

  if (fileName) {
    msg = `${msg}\n\nSource: ${fileName}`;

    if (lineNumber !== ErrorScreen.defaultProps.lineNumber) {
      msg = `${msg}, line ${lineNumber}`;
    }
  }


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

  const errorScreenClasses = classNames(css.errorScreen, {
    [css.fadeOut]: fadeOut,
  });

  if ((typeof process.env.OPTIONS === 'string') && (process.env.OPTIONS[0] === '1')) {
    return (
      <div className={errorScreenClasses}>
        <h2>Sorry, an error has occured.</h2>
      </div>
    );
  }

  return (
    <div className={errorScreenClasses}>
      <h2>{title}</h2>
      {subTitle && <p className={css.subTitle}>{subTitle}</p>}
      <p className={css.message}>{AnsiParser.removeAnsi(msg)}</p>
      <p className={css.version}>{process.env.DESCRIPTION}</p>
      <p className={css.version}>{`${process.env.PROJECTNAME}, Version ${process.env.VERSION}`}</p>
    </div>
  );
  //                                                                                  </editor-fold>
};

ErrorScreen.displayName = 'ErrorScreen';

ErrorScreen.propTypes = {
  title: PropTypes.string,
  subTitle: PropTypes.string,
  message: PropTypes.string,
  fileName: PropTypes.string,
  lineNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  fadeOut: PropTypes.bool,
};

ErrorScreen.defaultProps = {
  title: 'Error',
  subTitle: '',
  message: '',
  fileName: '',
  lineNumber: '',
  fadeOut: false,
};

export default ErrorScreen;
