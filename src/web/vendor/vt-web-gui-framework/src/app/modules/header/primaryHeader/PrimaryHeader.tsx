import { useSelector } from 'components/hooks/useSelector';
import { primaryMenuSlice } from 'store/menus/primaryMenu';
import { secondaryMenuSlice } from 'store/menus/secondaryMenu';

import { HamburgerIcon } from './hamburgerIcon/HamburgerIcon';
import { MenuNodes } from './menuNodes/MenuNodes';
import * as css from './primaryHeader.scss';
import type { PrimaryHeaderProps } from './primaryHeader.types';
import { Title } from './title/Title';


/**
 * React sub-component of the app module "Header" that either handles the hamburger icon or the
 * links of the primary menu in the primary section of the header. A title can also be shown here
 * under conditions.
 */
const PrimaryHeader = ({
  isMegaMenu, isHamburgerMenu, isHamburgerMenuVisible, title, onToggleHamburgerMenu,
}: PrimaryHeaderProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const primaryMenuNodesOf1stLevel = useSelector(primaryMenuSlice.selectMenuNodesOf1stLevel);
  const secondaryMenuNodesOf1stLevel = useSelector(secondaryMenuSlice.selectMenuNodesOf1stLevel);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const showHamburgerIcon = (
    isHamburgerMenu
    && (
      (primaryMenuNodesOf1stLevel.length > 1)
      || (
        (primaryMenuNodesOf1stLevel.length === 1)
        && (primaryMenuNodesOf1stLevel[0]!.submenuNodeIds.length > 0)
      )
      || (secondaryMenuNodesOf1stLevel.filter((menuNode) => !menuNode.ignoreAppearance).length > 0)
    )
  );

  const showPrimaryLinks = (
    !isHamburgerMenu
    && (
      (primaryMenuNodesOf1stLevel.length > 1)
      || (
        isMegaMenu
        && (primaryMenuNodesOf1stLevel.length === 1)
        && (primaryMenuNodesOf1stLevel[0]!.submenuNodeIds.length > 0))
    )
  );

  const showHeaderTitle = (isHamburgerMenu || !showPrimaryLinks);


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
      {showHamburgerIcon && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <HamburgerIcon isHamburgerMenuVisible={isHamburgerMenuVisible} onToggleHamburgerMenu={onToggleHamburgerMenu} />
      )}
      {showPrimaryLinks && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <MenuNodes menuNodes={primaryMenuNodesOf1stLevel} isMegaMenu={isMegaMenu} />
      )}
      {showHeaderTitle && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <Title title={title} />
      )}
    </div>
  );
  //                                                                                  </editor-fold>
};

PrimaryHeader.displayName = 'PrimaryHeader';


export { PrimaryHeader };
