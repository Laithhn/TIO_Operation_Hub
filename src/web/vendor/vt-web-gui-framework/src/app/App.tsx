import {
  lazy, Suspense, useEffect, useRef, useState,
} from 'react';

import { systemSettings } from 'assets/defines';
import { layout } from 'assets/styles';
import { DynamicHook } from 'components/helpers/dynamicHook';
import { useDispatch } from 'components/hooks/useDispatch';
import { useSelector } from 'components/hooks/useSelector';
import { IS_DESKTOP_APP } from 'desktopApp';
import { StorageItf, StorageType } from 'interfaces/storageItf';
import { classNames } from 'utils/classNames';
import { getViewportDims } from 'utils/getViewportDims';
import { throttle } from 'utils/throttle';

import * as css from './app.scss';
import * as appSlice from './app.slice';
import { type GridTemplateAreaMatrix } from './app.types';
import { Header } from './modules/header';
import { MainScope } from './modules/mainScope';
import { Modwins } from './modules/modwins';
import { Notifications } from './modules/notifications';
import type { SecondSidebarProps } from './modules/secondSidebar/secondSidebar.types';


// Load the following optional module(s) lazily to reduce the size of the bundle.
//const BurgerMenu = lazy(() => import('frame/burgerMenu'));
const FirstSidebar = lazy(() => import('./modules/firstSidebar').then((module) => ({ default: module.FirstSidebar })));
const SecondSidebar = lazy(() => import('./modules/secondSidebar').then((module) => ({ default: module.SecondSidebar })));
const Footer = lazy(() => import('./modules/footer').then((module) => ({ default: module.Footer })));


const throttleDelaySetViewportDimsMs = 100;

const gridTemplateAreaMatrix: GridTemplateAreaMatrix = [
  ['.', 'header', 'header', 'header', '.'],
  ['burgerMenu', 'firstSidebar', 'mainScope', 'secondSidebar', 'notifications'],
];

const gridTemplateAreaMatrixWithFooter: GridTemplateAreaMatrix = [
  ...gridTemplateAreaMatrix,
  ['.', 'footer', 'footer', 'footer', '.'],
];


/**
 * Function to dispatch a custom event with name "domChange" to the document to indicate any changes
 * on the DOM.
 */
const dispatchDomChangeEvent = (detail?: MutationRecord[] | Event) => {
  document.dispatchEvent(new CustomEvent('domChange', { detail }));
};


/**
 * React component of the main app of VtWebGuiFramework.
 */
const App = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const isAppReady = useSelector(appSlice.selectIsReady);
  const menusAppearance = useSelector(appSlice.selectMenusAppearance);
  const isHamburgerMenuVisible = useSelector(appSlice.selectIsHamburgerMenuVisible);
  const isFirstSidebarEnabled = useSelector(appSlice.selectIsFirstSidebarEnabled);
  const isSecondSidebarEnabled = useSelector(appSlice.selectIsSecondSidebarEnabled);
  const isFooterEnabled = useSelector(appSlice.selectIsFooterEnabled);
  const desktopAppStorageType = useSelector(appSlice.selectDesktopAppStorageType);
  const desktopAppWidth = useSelector(appSlice.selectDesktopAppWidth);
  const desktopAppHeight = useSelector(appSlice.selectDesktopAppHeight);

  const [secondSidebarWidth, setSecondSidebarWidth] = useState<number>(0);
  const [isSecondSidebarMinimized, setIsSecondSidebarMinimized] = useState<boolean>(true);

  const isDesktopAppInitRef = useRef(false);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isMegaMenu = (menusAppearance === 'megaMenu');
  const isHamburgerMenu = (menusAppearance === 'hamburgerMenu');

  const gridTemplateColumns = `0 ${
    isFirstSidebarEnabled ? `${layout.firstSidebar.width}px ` : ''
  }1fr ${
    isSecondSidebarEnabled ? `${isSecondSidebarMinimized ? '0' : `${secondSidebarWidth}px`} ` : ''
  }0`;

  const gridTemplateAreas = (isFooterEnabled ? gridTemplateAreaMatrixWithFooter : gridTemplateAreaMatrix).map((row) => `"${
    row.filter((_, idx) => (
      [0, 2, 4].includes(idx)
      || ((idx === 1) && isFirstSidebarEnabled)
      || ((idx === 3) && isSecondSidebarEnabled)
    )).map((cell) => (
      (cell === '.') ? cell : layout[cell].gridArea
    )).join(' ')
  }"`).join(' ');


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the callback prop "onToggleHamburgerMenu" of the app module "Header" to show or
   * hide the hamburger menu.
   */
  const handleToggleHamburgerMenu: React.ComponentProps<typeof Header>['onToggleHamburgerMenu'] = () => {
    dispatch(appSlice.toggleHamburgerMenu());
  };


  /**
   * Handler for the callback prop "onChange" of the app module "SecondSidebar".
   */
  const handleSecondSidebarChange: SecondSidebarProps['onChange'] = ({ width, isMinimized }) => {
    setSecondSidebarWidth(width);
    setIsSecondSidebarMinimized(isMinimized);
  };


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------------<editor-fold desc="Effect 1">
  // Effect for the common initialization of the app.
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    // set the initial viewport dimensions to the Redux store, at once and at the window resize
    // event (throttled)
    const dispatchViewportDimensions = throttle(() => {
      dispatch(appSlice.setViewportDimensions(getViewportDims()));
    }, throttleDelaySetViewportDimsMs);

    window.addEventListener('resize', dispatchViewportDimensions);
    dispatchViewportDimensions();

    // dispatch the custom DOM change event by the mutation observer
    const observer = new MutationObserver(dispatchDomChangeEvent);

    observer.observe(document, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true,
    });

    // dispatch the custom DOM change event by the window resize event
    window.addEventListener('resize', dispatchDomChangeEvent);

    // destruction
    return () => {
      window.removeEventListener('resize', dispatchViewportDimensions);
      observer.disconnect();
      window.removeEventListener('resize', dispatchDomChangeEvent);
    };
  }, [dispatch]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------------<editor-fold desc="Effect 2">
  // Effect for the special initialization of the desktop app.
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (IS_DESKTOP_APP && !isDesktopAppInitRef.current) {
      if (desktopAppStorageType === StorageType.internal) {
        dispatch(appSlice.initDesktopApp({}));
      } else {
        // create a storage connection
        const storage = new StorageItf<{ width: number; height: number }>(systemSettings.storage.reservedKeys['desktopApp']!, {
          hasSubValues: true,
          storageType: desktopAppStorageType,
          debounce: 3000,
        });

        // initialize the storage with the initial data from the configuration as default values
        void storage.init({ width: desktopAppWidth, height: desktopAppHeight }).then(({ width, height }) => {
          dispatch(appSlice.initDesktopApp({ width, height }));
        });
      }

      isDesktopAppInitRef.current = true;
    }
  }, [desktopAppStorageType, desktopAppWidth, desktopAppHeight, dispatch]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------------<editor-fold desc="Effect 3">
  // Effect to dispatch the custom DOM change event after the animation time has expired after
  // changing the CSS-grid rows or columns.
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    const timeout = setTimeout(dispatchDomChangeEvent, layout.animationTime.slowMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [isFooterEnabled, gridTemplateColumns]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!isAppReady) {
    return null;
  }


  const appClasses = classNames(css.app, {
    [css.withFooter]: isFooterEnabled,
  });

  return (
    <div className={appClasses} style={{ gridTemplateColumns, gridTemplateAreas }}>
      <DynamicHook path="useCommon" />
      <Header
        isMegaMenu={isMegaMenu}
        isHamburgerMenu={isHamburgerMenu}
        isHamburgerMenuVisible={isHamburgerMenuVisible}
        onToggleHamburgerMenu={handleToggleHamburgerMenu}
      />
      <MainScope />
      <Suspense fallback={null}>
        {isFirstSidebarEnabled && <FirstSidebar />} {/* eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908 */}
        {isSecondSidebarEnabled && <SecondSidebar onChange={handleSecondSidebarChange} />} {/* eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908 */}
      </Suspense>
      <Suspense fallback={null}>
        {isFooterEnabled && <Footer />} {/* eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908 */}
        {/*{isBurgerMenu && <BurgerMenu />}*/}
      </Suspense>
      {/* The order below is the order the parts are painted in, none of them carrying a z-index:
          the root of a content is a stacking context of its own, and a positioned element on the
          same layer covers it only if it comes later. So the modal windows follow every place a
          content is mounted in - the footer too, which the modal windows preceded until
          2026-10-20 and so lay under - and only the notifications follow them. */}
      <Modwins />
      <Notifications />
    </div>
  );
  //                                                                                  </editor-fold>
};

App.displayName = 'App';


export { App };
