import PropTypes from 'prop-types';

import classNames from 'utils/classNames';

import css from './text.scss';


/**
 * Stateless React component of the selection text of the multiple select box. It is not memoized
 * because prop "text" changes frequently.
 * Note, that if you call this component as a function, the default props are not considered!
 */
const Text = ({
  darkTheme, disabled, noSelection, text,
}) => {
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
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const textClasses = classNames(css.text, {
    [css.typoDarkTheme]: darkTheme,
    [css.typoDisabled]: disabled,
    [css.noSelection]: noSelection,
  });

  return (
    <span className={textClasses}>{text || '\u{a0}'}</span>
  );
  //                                                                                  </editor-fold>
};

Text.displayName = 'Text';

Text.propTypes = {
  darkTheme: PropTypes.bool,
  disabled: PropTypes.bool,
  noSelection: PropTypes.bool,
  text: PropTypes.string,
};

Text.defaultProps = {
  darkTheme: false,
  disabled: false,
  noSelection: false,
  text: '',
};

export default Text;
