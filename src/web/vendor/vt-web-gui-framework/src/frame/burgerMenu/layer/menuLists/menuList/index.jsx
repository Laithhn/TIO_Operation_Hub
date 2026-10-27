import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

import { selectors } from 'store';

import MenuNodeLink from './menuNodeLink';
import css from './menuList.scss';


/**
 * React component of the list of links for the primary or secondary menu nodes in the hamburger
 * menu.
 */
const MenuList = ({ parentMenuNodeId, isSecondaryMenu, onClickLink }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const menuSelectors = selectors.menus[isSecondaryMenu ? 'secondaryMenu' : 'primaryMenu'];
  const menuNodesOf1stLevel = useSelector(menuSelectors.getMenuNodesOf1stLevel);
  const submenuNodes = useSelector((state) => menuSelectors.getVisibleSubmenuNodesById(state, parentMenuNodeId));


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let menuNodes = null;

  if (parentMenuNodeId === null) {
    menuNodes = isSecondaryMenu
      ? menuNodesOf1stLevel.filter((menuNode) => !menuNode.ignoreAppearance)
      : menuNodesOf1stLevel;
  } else if (submenuNodes && (submenuNodes.length > 0)) {
    menuNodes = submenuNodes;
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

  if (!menuNodes) {
    return null;
  }

  return (
    <div className={css.menuList}>
      {menuNodes.map((menuNode) => (
        <MenuNodeLink
          key={menuNode.id}
          menuNode={menuNode}
          isSecondaryMenu={isSecondaryMenu}
          onClick={onClickLink}
        />
      ))}
    </div>
  );
  //                                                                                  </editor-fold>
};

MenuList.displayName = 'MenuList';

MenuList.propTypes = {
  parentMenuNodeId: PropTypes.string,
  isSecondaryMenu: PropTypes.bool,
  onClickLink: PropTypes.func,
};

MenuList.defaultProps = {
  parentMenuNodeId: null,
  isSecondaryMenu: false,
  onClickLink() {},
};

export default MenuList;
