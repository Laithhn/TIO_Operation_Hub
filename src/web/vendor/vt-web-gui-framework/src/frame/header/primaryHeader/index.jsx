import { useSelector } from 'react-redux';

import Enums from 'assets/enums';
import { selectors } from 'store';

import BurgerIcon from './burgerIcon';
import PrimaryLinks from './primaryLinks';
import Title from './title';
import css from './primaryHeader.scss';


/**
 * React component of the primary section of the header that includes either the burger menu icon or
 * the primary links. A title can also be shown under conditions.
 */
const PrimaryHeader = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const menusAppearance = useSelector(selectors.menus.common.getAppearance);
  const primaryMenuNodesOf1stLevel = useSelector(selectors.menus.primaryMenu.getMenuNodesOf1stLevel);
  const secondaryMenuNodesOf1stLevel = useSelector(selectors.menus.secondaryMenu.getMenuNodesOf1stLevel);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isBurgerMenu = (menusAppearance === Enums.MenusAppearance.BURGER_MENU);
  const isMegaMenu = (menusAppearance === Enums.MenusAppearance.MEGA_MENU);

  const showBurgerIcon = (
    isBurgerMenu
    && (
      (primaryMenuNodesOf1stLevel.length > 1)
      || (
        (primaryMenuNodesOf1stLevel.length === 1)
        && (primaryMenuNodesOf1stLevel[0].submenuNodeIds.length > 0)
      )
      || (secondaryMenuNodesOf1stLevel.filter((menuNode) => !menuNode.ignoreAppearance).length > 0)
    )
  );

  const showPrimaryLinks = (
    !isBurgerMenu
    && (
      (primaryMenuNodesOf1stLevel.length > 1)
      || (
        isMegaMenu
        && (primaryMenuNodesOf1stLevel.length === 1)
        && (primaryMenuNodesOf1stLevel[0].submenuNodeIds.length > 0))
    )
  );

  const showTitle = (isBurgerMenu || !showPrimaryLinks);


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
    <div className={css.primaryHeader}>
      {showBurgerIcon && <BurgerIcon />}
      {showPrimaryLinks && (<PrimaryLinks isMegaMenu={isMegaMenu} />)}
      {showTitle && <Title />}
    </div>
  );
  //                                                                                  </editor-fold>
};

PrimaryHeader.displayName = 'PrimaryHeader';

export default PrimaryHeader;
