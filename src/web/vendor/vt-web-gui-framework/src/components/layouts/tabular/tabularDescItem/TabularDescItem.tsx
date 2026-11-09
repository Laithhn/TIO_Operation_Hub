import { spacePx } from 'assets/styles';
import { classNames } from 'utils/classNames';

import * as css from './tabularDescItem.scss';
import type { TabularDescItemProps } from './tabularDescItem.types';


/**
 * React component of the sub-component "TabularDescItem" of the layout component "Tabular", a
 * description item that can be used as child of a tabular.
 */
const TabularDescItem = ({
  tabularStyle = 'line', paddingRight, paddingLeft, spaceBefore = false,
  spaceAfter = false, children,
}: TabularDescItemProps) => {
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

  const tabularDescItemClasses = classNames(css.tabularDescItem, {
    [css.tabularStyleIsLine]: (tabularStyle === 'line'),
    // two classes out of one flag, and each says what it drives: the divider line below the
    // description, and the colour of the description's own lettering
    [css.spaceBefore]: spaceBefore,
    [css.spaceAfter]: spaceAfter,
  });

  // The tabular only hands over these two at the style "background", where each item carries its own
  // horizontal spacing; at "line" the tabular carries it for everything inside it, this description
  // included.
  const tabularDescItemStyle = {
    ...(paddingRight && { paddingRight: spacePx[paddingRight] }),
    ...(paddingLeft && { paddingLeft: spacePx[paddingLeft] }),
  };

  return (
    <div className={tabularDescItemClasses} style={tabularDescItemStyle}>
      {children}
    </div>
  );
  //                                                                                  </editor-fold>
};

TabularDescItem.displayName = 'TabularDescItem';


export { TabularDescItem };
