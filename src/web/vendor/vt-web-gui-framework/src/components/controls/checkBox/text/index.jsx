import PropTypes from 'prop-types';
import { memo } from 'react';

import Enums from 'assets/enums';
import bbCode from 'utils/bbCode';
import classNames from 'utils/classNames';

import css from './text.scss';


/**
 * Memoized React component of the text of a check box.
 */
const Text = memo(({
  disabled, darkTheme, textType, textWrap, children,
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


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const checkBoxTextClasses = classNames(css.text, {
    [css.textAsLabel]: (textType === Enums.TextType.LABEL),
    [css.typoDarkTheme]: darkTheme,
    [css.typoDisabled]: disabled,
    [css.typoNoOverflow]: !textWrap,
  });

  return (
    <span className={checkBoxTextClasses}>{bbCode(children)}</span>
  );
  //                                                                                  </editor-fold>
});

Text.displayName = 'Text';

Text.propTypes = {
  disabled: PropTypes.bool,
  darkTheme: PropTypes.bool,
  textType: PropTypes.instanceOf(Enums.TextType),
  textWrap: PropTypes.bool,
  children: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

Text.defaultProps = {
  disabled: false,
  darkTheme: false,
  textType: Enums.TextType.VALUE,
  textWrap: false,
  children: '',
};

export default Text;
