import { memo } from 'react';
import { useSelector } from 'react-redux';

import Enums from 'assets/enums';
import { selectors, hooks } from 'store';
import classNames from 'utils/classNames';

import ContentScope from './contentScope';
import PrimarySubmenu from './primarySubmenu';
import Stepper from './stepper';
import Title from './title';
import css from './firstSidebar.scss';


/**
 * Memoized React component of the first sidebar.
 */
const FirstSidebar = memo(() => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = hooks.useI18n();

  const title = useSelector(selectors.sidebars.firstSidebar.getTitle);
  const contentPath = useSelector(selectors.sidebars.firstSidebar.getContentPath);
  const isStepperVisible = useSelector(selectors.sidebars.stepper.isVisible);
  const menusAppearance = useSelector(selectors.menus.common.getAppearance);
  const activeMenuNode = useSelector(selectors.menus.primaryMenu.getActiveMenuNode);
  const submenuNodes = useSelector((state) => selectors.menus.primaryMenu.getVisibleSubmenuNodesById(state, activeMenuNode?.menuNodeTree[0])) ?? [];


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const showPrimarySubmenu = (menusAppearance === Enums.MenusAppearance.DEFAULT) && (submenuNodes.length > 0);
  const showStepper = !showPrimarySubmenu && isStepperVisible;
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
      {title && <Title title={translateText(title)} />}
      {showPrimarySubmenu && (
        <PrimarySubmenu menuNodes={submenuNodes} levelOfActiveMenuNode={levelOfActiveMenuNode} />
      )}
      {showStepper && <Stepper />}
      {contentPath && <ContentScope contentPath={contentPath} />}
    </div>
  );
  //                                                                                  </editor-fold>
});

FirstSidebar.displayName = 'FirstSidebar';

export default FirstSidebar;
