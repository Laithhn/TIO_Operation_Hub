import { layout } from 'assets/styles';

import * as css from './divider.scss';
import type { DividerProps } from './divider.types';


const svgHeight = 60;


/**
 * React sub-component of a divider, placed between the breadcrumb entries of the
 * sub-component "Breadcrumbs" of the layout component "MainToolbar".
 */
const Divider = ({ isScopeModwin }: DividerProps) => {
  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const viewBoxHeight = layout.mainToolbar[isScopeModwin ? 'heightInModwin' : 'heightInMainScope'];
  const viewBoxTop = Math.max(0, (svgHeight - viewBoxHeight) / 2);


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
    <svg
      viewBox={`0 ${viewBoxTop} 15 ${viewBoxHeight}`}
      width="15px"
      height="100%"
      className={css.divider}
    >
      <path d="M2,0V5 C2,11 5.14,14.77 7.5,18 9.86,21.23 13,25 13,30 13,35 9.954,38.87 7.5,42 5.046,45.13 2,49 2,55L2,60" />
    </svg>
  );
  //                                                                                  </editor-fold>
};

Divider.displayName = 'Divider';


export { Divider };
