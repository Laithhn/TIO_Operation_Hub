import { useEffect, useRef } from 'react';

import { useSelector } from 'components/hooks/useSelector';
import { IS_DESKTOP_APP, moveApp } from 'desktopApp';

import * as css from './header.scss';
import { selectLogo, selectTitle } from './header.slice';
import type { HeaderProps } from './header.types';
import { HeaderLogo } from './headerLogo/HeaderLogo';
import { PrimaryHeader } from './primaryHeader/PrimaryHeader';
import { SecondaryHeader } from './secondaryHeader/SecondaryHeader';


/**
 * React component of the app module "Header".
 */
const Header = ({
  isMegaMenu, isHamburgerMenu, isHamburgerMenuVisible, onToggleHamburgerMenu,
}: HeaderProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const logo = useSelector(selectLogo);
  const title = useSelector(selectTitle);

  const headerRef = useRef<HTMLElement>(null);
  const draggingReadyRef = useRef(false);
  const draggingStartPosXRef = useRef(0);
  const draggingStartPosYRef = useRef(0);


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

  /**
   * Handler for synthetic React pointer event "onPointerDown" on the header to prepare dragging the desktop
   * app.
   */
  const handlePointerDown: React.PointerEventHandler<HTMLElement> = (event) => {
    if (event.target === headerRef.current) {
      draggingReadyRef.current = true;
      draggingStartPosXRef.current = event.screenX;
      draggingStartPosYRef.current = event.screenY;
    }
  };


  /**
   * Handler for native event "pointermove" on the window element to move the desktop app, if
   * dragging is switched on in handlePointerDown.
   */
  const handleWindowPointerMove = (event: PointerEvent) => {
    if (draggingReadyRef.current) {
      const posDiffX = event.screenX - draggingStartPosXRef.current;
      const posDiffY = event.screenY - draggingStartPosYRef.current;

      draggingStartPosXRef.current = event.screenX;
      draggingStartPosYRef.current = event.screenY;

      moveApp(posDiffX, posDiffY);
    }
  };


  /**
   * Handler for native event "pointerup" on the window element to stop dragging the desktop app.
   */
  const handleWindowPointerUp = () => {
    draggingReadyRef.current = false;
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (IS_DESKTOP_APP) {
      window.addEventListener('pointerup', handleWindowPointerUp);
      window.addEventListener('pointermove', handleWindowPointerMove);

      return () => {
        window.removeEventListener('pointerup', handleWindowPointerUp);
        window.removeEventListener('pointermove', handleWindowPointerMove);
      };
    }

    return undefined;
  }, []);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <header
      ref={headerRef}
      className={css.header}
      {...(IS_DESKTOP_APP && { onPointerDown: handlePointerDown })}
    >
      <HeaderLogo logo={logo} />
      <PrimaryHeader
        isMegaMenu={isMegaMenu}
        isHamburgerMenu={isHamburgerMenu}
        isHamburgerMenuVisible={isHamburgerMenuVisible}
        title={title}
        onToggleHamburgerMenu={onToggleHamburgerMenu}
      />
      <SecondaryHeader />
    </header>
  );
  //                                                                                  </editor-fold>
};

Header.displayName = 'Header';


export { Header };
