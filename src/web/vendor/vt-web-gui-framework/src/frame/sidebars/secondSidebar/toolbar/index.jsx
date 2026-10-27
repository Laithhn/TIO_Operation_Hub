import { memo } from 'react';
import { useSelector } from 'react-redux';

import { selectors } from 'store';

import css from './toolbar.scss';
import MinimizeButton from './minimizeButton';


/**
 *
 */
const Toolbar = memo(() => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const showMinimizeButton = useSelector(selectors.sidebars.secondSidebar.isMinimizable);


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
    <div className={css.secondSidebarToolbar}>
      {showMinimizeButton && <MinimizeButton />}
      <div id="viSecondSidebarToolbar" className={css.toolbarContr} />
    </div>
  );
});

Toolbar.displayName = 'Toolbar';

export default Toolbar;
