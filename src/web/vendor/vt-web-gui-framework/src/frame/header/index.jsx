import { memo, useRef, useEffect } from 'react';

import { IS_DESKTOP_APP, moveApp } from 'desktopApp';

import Logo from './logo';
import PrimaryHeader from './primaryHeader';
import SecondaryHeader from './secondaryHeader';
import css from './header.scss';


/**
 * Memoized React component of the header of the frame.
 */
const Header = memo(() => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const headerRef = useRef();
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
   * Handler for synthetic React event "onPointerDown" on the header to prepare dragging the desktop
   * app.
   */
  const handlePointerDown = (event) => {
    if (event.target === headerRef.current) {
      draggingReadyRef.current = true;
      draggingStartPosXRef.current = event.screenX;
      draggingStartPosYRef.current = event.screenY;
    }
  };


  /**
   * Handler for native event "pointermove" on the window to move the desktop app, if dragging is
   * switched on in handlePointerDown.
   */
  const handleWindowPointerMove = (event) => {
    if (draggingReadyRef.current) {
      const posDiffX = event.screenX - draggingStartPosXRef.current;
      const posDiffY = event.screenY - draggingStartPosYRef.current;

      draggingStartPosXRef.current = event.screenX;
      draggingStartPosYRef.current = event.screenY;

      moveApp(posDiffX, posDiffY);
    }
  };


  /**
   * Handler for native event "pointerup" on the window to stop dragging the desktop app.
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
      <Logo />
      <PrimaryHeader />
      <SecondaryHeader />
    </header>
  );
  //                                                                                  </editor-fold>
});

Header.displayName = 'Header';

export default Header;
