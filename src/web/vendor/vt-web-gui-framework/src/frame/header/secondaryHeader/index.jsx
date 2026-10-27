import { useSelector } from 'react-redux';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import { IS_DESKTOP_APP } from 'desktopApp';
import SelectLanguage from 'frame/specialMenuNodes/selectLanguage';
import { selectors } from 'store';

import SecondaryLink from './secondaryLink';
import WindowControlPanel from './windowControlPanel';
import css from './secondaryHeader.scss';


/**
 * React component of the secondary section of the header that includes the buttons of the secondary
 * menu nodes of the 1st menu level and of some special menu nodes.
 */
const SecondaryHeader = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const menusAppearance = useSelector(selectors.menus.common.getAppearance);
  const menuNodes = useSelector(selectors.menus.secondaryMenu.getMenuNodesOf1stLevel);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const showMenuNodes = ((menusAppearance === Enums.MenusAppearance.DEFAULT) || (menusAppearance === Enums.MenusAppearance.MEGA_MENU));


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


  return (
    <div className={css.secondaryHeader}>
      {menuNodes.filter(
        (menuNode) => (showMenuNodes || menuNode.ignoreAppearance),
      ).map((menuNode) => {
        const { id, disabled, isSpecialMenuNode } = menuNode;

        if (!isSpecialMenuNode) {
          return <SecondaryLink key={id} menuNode={menuNode} />;
        }

        if (id === defines.system.specialMenuNodeIds.selectLanguage) {
          return (
            <div key={id} className={css.secondaryHeaderContr}>
              <SelectLanguage disabled={disabled} darkTheme />
            </div>
          );
        }

        return null;
      })}
      {IS_DESKTOP_APP && <WindowControlPanel />}
    </div>
  );
};

SecondaryHeader.displayName = 'SecondaryHeader';

export default SecondaryHeader;
