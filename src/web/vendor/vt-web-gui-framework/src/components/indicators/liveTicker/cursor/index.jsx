import { memo } from 'react';

import { classNames } from 'utils/classNames';

import * as css from './cursor.scss';


//Cursor.propTypes = {
//  size: PropTypes.string,
//  darkTheme: PropTypes.bool,
//};

/**
 *
 */
const Cursor = memo(({ size = 'small', darkTheme = false }) => {
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
    [css.typoValueSmall]: !['normal', 'large', 'xl', 'xxl'].includes(size),
    [css.typoValueLarge]: (size === 'large'),
    [css.typoValueXL]: (size === 'xl'),
    [css.typoValueXXL]: (size === 'xxl'),
    [css.typoDarkTheme]: darkTheme,
  });

  return (
    <span className={cursorClasses}>|</span>
  );
  //
});

Cursor.displayName = 'Cursor';

export default Cursor;
