import * as appSlice from 'app/app.slice';
import { SelectLanguage } from 'app/modules/selectLanguage';
import { systemSettings } from 'assets/defines';
import { useSelector } from 'components/hooks/useSelector';
import { IS_DESKTOP_APP } from 'desktopApp';
import { secondaryMenuSlice } from 'store/menus/secondaryMenu';

import { MenuNode } from './menuNode/MenuNode';
import * as css from './secondaryHeader.scss';
import { WindowControlPanel } from './windowControlPanel/WindowControlPanel';


/**
 * React component of the app module "SecondaryHeader", the secondary section of the header that
 * includes the buttons of the secondary menu nodes of the 1st menu level and of some special menu
 * nodes.
 */
const SecondaryHeader = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const menusAppearance = useSelector(appSlice.selectMenusAppearance);
  const menuNodes = useSelector(secondaryMenuSlice.selectMenuNodesOf1stLevel);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const showMenuNodes = ((menusAppearance === 'default') || (menusAppearance === 'megaMenu'));


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
    <div className={css.secondaryHeader}>
      {menuNodes.filter(
        (menuNode) => (showMenuNodes || menuNode.ignoreAppearance),
      ).map((menuNode) => {
        const { id, isDisabled, isSpecialMenuNode } = menuNode;

        if (!isSpecialMenuNode) {
          return <MenuNode key={id} menuNode={menuNode} />;
        }

        if (id === systemSettings.specialMenuNodeIds.selectLanguage) {
          return (
            <div key={id} className={css.secondaryHeaderContr}>
              <SelectLanguage disable={isDisabled} />
            </div>
          );
        }

        return null;
      })}
      {IS_DESKTOP_APP && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <WindowControlPanel />
      )}
    </div>
  );
  //                                                                                  </editor-fold>
};

SecondaryHeader.displayName = 'SecondaryHeader';


export { SecondaryHeader };
