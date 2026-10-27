import PropTypes from 'prop-types';
import { memo } from 'react';

import Enums from 'assets/enums';
import classNames from 'utils/classNames';

import css from './cursor.scss';


/**
 *
 */
const Cursor = memo(({ size, darkTheme }) => {
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

  const cursorClasses = classNames(css.cursor, {
    [css.typoValueSmall]: ![Enums.ValueSize.NORMAL, Enums.ValueSize.LARGE, Enums.ValueSize.XL, Enums.ValueSize.XXL].includes(size),
    [css.typoValueLarge]: (size === Enums.ValueSize.LARGE),
    [css.typoValueXL]: (size === Enums.ValueSize.XL),
    [css.typoValueXXL]: (size === Enums.ValueSize.XXL),
    [css.typoDarkTheme]: darkTheme,
  });

  return (
    <span className={cursorClasses}>|</span>
  );
  //
});

Cursor.displayName = 'Cursor';

Cursor.propTypes = {
  size: PropTypes.instanceOf(Enums.ValueSize),
  darkTheme: PropTypes.bool,
};

Cursor.defaultProps = {
  size: Enums.ValueSize.SMALL,
  darkTheme: false,
};

export default Cursor;
