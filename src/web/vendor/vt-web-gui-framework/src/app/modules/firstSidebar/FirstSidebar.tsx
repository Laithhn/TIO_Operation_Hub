import * as appSlice from 'app/app.slice';
import { useI18n } from 'components/hooks/useI18n';
import { useSelector } from 'components/hooks/useSelector';
import { primaryMenuSlice } from 'store/menus/primaryMenu';
import { classNames } from 'utils/classNames';

import { ContentScope } from './contentScope/ContentScope';
import * as css from './firstSidebar.scss';
import { selectContentPath, selectTitle } from './firstSidebar.slice';
import { Menu } from './menu/Menu';
import { Title } from './title/Title';


/**
 * React component of the app module "FirstSidebar".
 */
const FirstSidebar = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = useI18n();

  const title = useSelector(selectTitle);
  const contentPath = useSelector(selectContentPath);
//  const isStepperVisible = useSelector(selectors.sidebars.stepper.isVisible);
  const menusAppearance = useSelector(appSlice.selectMenusAppearance);
  const activeMenuNode = useSelector(primaryMenuSlice.selectActiveMenuNode);
  const submenuNodes = useSelector((state) => primaryMenuSlice.selectVisibleSubmenuNodes(state, activeMenuNode?.menuNodeTree[0] ?? '')) ?? [];


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const showMenu = (menusAppearance === 'default') && (submenuNodes.length > 0);
//  const showStepper = !showPrimarySubmenu && isStepperVisible;
  const levelOfActiveMenuNode = activeMenuNode?.level ?? 0;


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

  const firstSidebarClasses = classNames(css.firstSidebar, {
    [css.withTitle]: !!title,
  });

  return (
    <div className={firstSidebarClasses}>
      {!!title && <Title title={translateText(title)} />}
      {showMenu && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <Menu menuNodes={submenuNodes} levelOfActiveMenuNode={levelOfActiveMenuNode} />
      )}
      {/*{showStepper && <Stepper />}*/}
      {!!contentPath && <ContentScope contentPath={contentPath} />}
    </div>
  );
  //                                                                                  </editor-fold>
};

FirstSidebar.displayName = 'FirstSidebar';


export { FirstSidebar };
