import {
  lazy, Suspense, useCallback, useEffect, useRef, useState,
} from 'react';

import type { MenuNodeId } from 'store/menus/primaryMenu';

import { Marker } from './marker/Marker';
import { MenuNode } from './menuNode/MenuNode';
import * as css from './menuNodes.scss';
import type { MenuNodesProps } from './menuNodes.types';


// Load the following optional module(s) lazily to reduce the size of the bundle.
const MegaMenu = lazy(() => import('./megaMenu/MegaMenu').then((module) => ({ default: module.MegaMenu })));


/**
 * React sub-component of the app module "Header" that includes the links of the 1st menu level of
 * the primary menu nodes into the primary section of the header. There are two ways to present
 * these links: for default menu appearance and for mega menu appearance.
 */
const MenuNodes = ({ menuNodes, isMegaMenu }: MenuNodesProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [activeLinkData, setActiveLinkData] = useState<{
    menuNodeId: MenuNodeId | null; relPosX: number; width: number;
  }>({
    menuNodeId: null, relPosX: 0, width: 0,
  });

  const [megaMenuData, setMegaMenuData] = useState<{
    menuNodeId: MenuNodeId | null; show: boolean;
  }>({
    menuNodeId: null, show: false,
  });

  const menuNodeLinksRef = useRef<HTMLDivElement>(null);
  const megaMenuRef = useRef<React.ComponentRef<typeof MegaMenu>>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to hide the mega menu.
   *
   * It keeps its useCallback: a function an effect lists in its dependencies depends on it, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * along that chain.
   */
  const hideMegaMenu = useCallback(() => {
    setMegaMenuData((prevValue) => (prevValue.show ? { ...prevValue, show: false } : prevValue));
  }, []);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the callback prop "onActive" of the sub-components "MenuNode" to set the ID and the
   * position data of the currently active link, that is used by the marker.
   */
  const handleActiveLink: React.ComponentProps<typeof MenuNode>['onActive'] = ({ menuNodeId, relPosX, width }) => {
    setActiveLinkData((prevValue) => (((menuNodeId !== prevValue.menuNodeId) || (relPosX !== prevValue.relPosX) || (width !== prevValue.width))
      ? { menuNodeId, relPosX, width }
      : prevValue
    ));
  };


  /**
   * Handler for the callback prop "onClick" of the sub-components "MenuNode" to set the ID of the
   * clicked link for the mega menu and show or hide it (only if the mega menu is shown).
   */
  const handleClickLink: NonNullable<React.ComponentProps<typeof MenuNode>['onClick']> = ({ menuNodeId }) => {
    setMegaMenuData((prevValue) => ({
      menuNodeId,
      show: (menuNodeId !== prevValue.menuNodeId) ? true : !prevValue.show,
    }));
  };


  /**
   * Handler for the callback prop "onClose" of the sub-component "MegaMenu" to hide the mega menu.
   */
  const handleCloseMegaMenu: React.ComponentProps<typeof MegaMenu>['onClose'] = () => {
    hideMegaMenu();
  };


  /**
   * Handler for the native event "pointerdown" of the window element. Call
   * handleCloseMegaMenu, if
   * a) the target of the event is inside the root container (but not a primary link), or
   * b) the target of the event is inside the temporary container like the mega menu, but below
   *    this in the DOM hierarchy.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const handleWindowPointerDown = useCallback((event: PointerEvent) => {
    if (
      megaMenuRef.current && menuNodeLinksRef.current && (event.target instanceof Node)
      && !megaMenuRef.current.contains(event.target)
      && !menuNodeLinksRef.current.contains(event.target)
    ) {
      if (document.getElementById(process.env['ELEM_ID_ROOT'] ?? '')?.contains(event.target)) {
        event.preventDefault(); // otherwise text selection works
        hideMegaMenu();
      } else {
        const tempChildren = document.getElementById(process.env['ELEM_ID_TEMP'] ?? '')?.children ?? [];

        for (const tempChild of tempChildren) {
          if (tempChild.contains(event.target)) {
            event.preventDefault(); // otherwise text selection works
            hideMegaMenu();
            break;
          } else if (tempChild.contains(megaMenuRef.current)) {
            break;
          }
        }
      }
    }
  }, [hideMegaMenu]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (isMegaMenu) {
      window.addEventListener('pointerdown', handleWindowPointerDown);

      return () => {
        window.removeEventListener('pointerdown', handleWindowPointerDown);
      };
    }

    return undefined;
  }, [isMegaMenu, handleWindowPointerDown]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <div ref={menuNodeLinksRef} className={css.menuNodes}>
      {!!activeLinkData.menuNodeId && (
        <Marker
          posX={activeLinkData.relPosX}
          width={activeLinkData.width}
          menuNodeId={activeLinkData.menuNodeId}
          dynamicEffect
        />
      )}
      {menuNodes.map((menuNode) => (
        <MenuNode
          key={menuNode.id}
          menuNode={menuNode}
          suppressNavigationIfActive={isMegaMenu}
          onActive={handleActiveLink}
          {...(isMegaMenu && { onClick: handleClickLink })}
        />
      ))}
      <Suspense fallback={null}>
        {isMegaMenu && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
          <MegaMenu
            ref={megaMenuRef}
            menuNodeId={megaMenuData.menuNodeId}
            show={megaMenuData.show}
            onClose={handleCloseMegaMenu}
          />
        )}
      </Suspense>
    </div>
  );
  //                                                                                  </editor-fold>
};


MenuNodes.displayName = 'MenuNodes';


export { MenuNodes };
