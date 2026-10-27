import {
  lazy, memo, useRef, useMemo, useEffect, Suspense,
} from 'react';
import { useSelector } from 'react-redux';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import Footer from 'frame/footer';
import Header from 'frame/header';
import MainScope from 'frame/mainScope';
import Modwins from 'frame/modwins';
import Notifications from 'frame/notifications';
import { FirstSidebar, SecondSidebar } from 'frame/sidebars';
import { selectors } from 'store';
import classNames from 'utils/classNames';
import dispatchDomChangeEvent from 'utils/dispatchDomChangeEvent';

import css from './app.scss';

// load the following optional components lazily to reduce the size of the bundle
const BurgerMenu = lazy(() => import('frame/burgerMenu'));


const useCommon = window.viwgfUseCommon?.default;
const isUseCommon = (typeof useCommon === 'function');


/**
 * Memoized React component that only calls once the common React Hook.
 */
const CommonHook = memo(() => {
  useCommon();
  return null;
});

CommonHook.displayName = 'CommonHook';


/**
 * React component with all the main React components of the frame of VtWebGuiFramework: the header,
 * the sidebars, a container for the main toolbar, the main scope, the footer and the component with
 * the modal windows.
 */
const App = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const isFirstSidebarEnabled = useSelector(selectors.sidebars.firstSidebar.isEnabled);
  const isFirstSidebarBelowMainToolbar = !useSelector(selectors.sidebars.firstSidebar.getTitle);
  const isSecondSidebarEnabled = useSelector(selectors.sidebars.secondSidebar.isEnabled);
  const secondSidebarWidth = useSelector(selectors.sidebars.secondSidebar.getWidth);
  const isSecondSidebarMinimized = useSelector(selectors.sidebars.secondSidebar.isMinimized);
  const isSecondSidebarBelowMainToolbar = useSelector(selectors.sidebars.secondSidebar.isBelowMainToolbar);
  const isFooterEnabled = useSelector(selectors.footer.isEnabled);
  const menusAppearance = useSelector(selectors.menus.common.getAppearance);

  const timeoutRef = useRef(0);
  const prevIsSecondSidebarMinimizedRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isBurgerMenu = (menusAppearance === Enums.MenusAppearance.BURGER_MENU);

  // derive the value of grid-template-columns, not memoized because it depends on values that can
  // often change (isSecondSidebarMinimized and secondSidebarWidth)
  const gridTemplateColumns = [
    '0',
    ...(isFirstSidebarEnabled ? [`${defines.layout.sidebars.firstSidebarWidth}px`] : []),
    '1fr',
    ...(isSecondSidebarEnabled ? [`${isSecondSidebarMinimized ? '0' : `${secondSidebarWidth}px`}`] : []),
    '0',
  ].join(' ');

  // derive the memoized value of grid-template-areas
  const gridTemplateAreas = useMemo(() => {
    let gTA;

    if (isFirstSidebarEnabled && isSecondSidebarEnabled) {
      gTA = '". viAreaHeader viAreaHeader viAreaHeader ."'
        + ` "viAreaBurgerMenu ${(isFirstSidebarBelowMainToolbar) ? 'viAreaMainToolbar' : 'viAreaFirstSidebar'} viAreaMainToolbar ${isSecondSidebarBelowMainToolbar ? 'viAreaMainToolbar' : 'viAreaSecondSidebar'} viAreaNotifications"`
        + ' "viAreaBurgerMenu viAreaFirstSidebar viAreaMainScope viAreaSecondSidebar viAreaNotifications"'
        + `${isFooterEnabled ? ' ". viAreaFooter viAreaFooter viAreaFooter ."' : ''}`;
    } else if (isFirstSidebarEnabled) {
      gTA = '". viAreaHeader viAreaHeader ."'
        + ` "viAreaBurgerMenu ${(isFirstSidebarBelowMainToolbar) ? 'viAreaMainToolbar' : 'viAreaFirstSidebar'} viAreaMainToolbar viAreaNotifications"`
        + ' "viAreaBurgerMenu viAreaFirstSidebar viAreaMainScope viAreaNotifications"'
        + `${isFooterEnabled ? ' ". viAreaFooter viAreaFooter ."' : ''}`;
    } else if (isSecondSidebarEnabled) {
      gTA = '". viAreaHeader viAreaHeader ."'
        + ` "viAreaBurgerMenu viAreaMainToolbar ${isSecondSidebarBelowMainToolbar ? 'viAreaMainToolbar' : 'viAreaSecondSidebar'} viAreaNotifications"`
        + ' "viAreaBurgerMenu viAreaMainScope viAreaSecondSidebar viAreaNotifications"'
        + `${isFooterEnabled ? ' ". viAreaFooter viAreaFooter ."' : ''}`;
    } else {
      gTA = '". viAreaHeader ."'
        + ' "viAreaBurgerMenu viAreaMainToolbar viAreaNotifications"'
        + ' "viAreaBurgerMenu viAreaMainScope viAreaNotifications"'
        + `${isFooterEnabled ? ' ". viAreaFooter ."' : ''}`;
    }

    return gTA;
  }, [
    isFirstSidebarEnabled, isFirstSidebarBelowMainToolbar, isSecondSidebarEnabled,
    isSecondSidebarBelowMainToolbar, isFooterEnabled,
  ]);


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

  // Dispatch the custom DOM change event after the animation time has expired after changing the
  // CSS-grid rows or columns.
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      dispatchDomChangeEvent();
    }, defines.layout.defaultAnimationTimeMs);

    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, [gridTemplateColumns, isFooterEnabled]);


  //
  useEffect(() => {
    prevIsSecondSidebarMinimizedRef.current = isSecondSidebarMinimized;
  }, [isSecondSidebarMinimized]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const appClasses = classNames(css.app, {
    [css.withColumnsTransition]: isSecondSidebarEnabled && (prevIsSecondSidebarMinimizedRef.current !== isSecondSidebarMinimized),
    [css.withFooter]: isFooterEnabled,
  });

  return (
    <div
      className={appClasses}
      style={{
        gridTemplateColumns,
        gridTemplateAreas,
      }}
    >
      {isUseCommon && <CommonHook />}
      <Header />
      <MainScope />
      <div id="viMainToolbar" className={css.mainToolbar} />
      {isFirstSidebarEnabled && <FirstSidebar />}
      {isSecondSidebarEnabled && <SecondSidebar />}
      {isFooterEnabled && <Footer />}
      <Modwins />
      <Suspense fallback={null}>
        {isBurgerMenu && <BurgerMenu />}
      </Suspense>
      <Notifications />
    </div>
  );
  //                                                                                  </editor-fold>
};

App.displayName = 'App';

export default App;
