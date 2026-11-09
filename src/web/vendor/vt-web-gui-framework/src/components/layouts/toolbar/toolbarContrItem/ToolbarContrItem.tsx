import { useStylingProps } from 'components/hooks/useStylingProps';

import * as css from './toolbarContrItem.scss';
import { type ToolbarContrItemProps, toolbarContrItemStylingProps } from './toolbarContrItem.types';


/**
 * React component of a toolbar container item, that is a grid container to place further elements
 * inside a toolbar (component Toolbar). The children elements can only placed in one row.
 */
const ToolbarContrItem = ({ id, children, ...restProps }: ToolbarContrItemProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { elemStyle } = useStylingProps(restProps, toolbarContrItemStylingProps, { addCombinedStyle: true });


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
    <div {...(id && { id })} className={css.toolbarContrItem} style={elemStyle}>
      {children}
    </div>
  );
  //                                                                                  </editor-fold>
};

ToolbarContrItem.displayName = 'ToolbarContrItem';


export { ToolbarContrItem };
