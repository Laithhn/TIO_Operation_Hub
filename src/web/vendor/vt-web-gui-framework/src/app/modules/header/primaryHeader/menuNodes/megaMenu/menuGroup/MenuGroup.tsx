import { useSelector } from 'components/hooks/useSelector';
import { primaryMenuSlice } from 'store/menus/primaryMenu';

import * as css from './menuGroup.scss';
import type { MenuGroupProps } from './menuGroup.types';
import { MenuNode } from './menuNode/MenuNode';


/**
 * React sub-component of the app module "Header" to render a group in the mega menu with the links
 * of a given menu node and below the links of its submenu nodes.
 */
const MenuGroup = ({ menuNode, onClose }: MenuGroupProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const submenuNodes = useSelector((state) => primaryMenuSlice.selectVisibleSubmenuNodes(state, menuNode.id)) ?? [];


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
    <div className={css.menuGroup}>
      <MenuNode key={menuNode.id} menuNode={menuNode} onClose={onClose} />
      {submenuNodes.map((submenuNode) => (
        <MenuNode key={submenuNode.id} menuNode={submenuNode} onClose={onClose} />
      ))}
    </div>
  );
  //                                                                                  </editor-fold>
};

MenuGroup.displayName = 'MenuGroup';


export { MenuGroup };
