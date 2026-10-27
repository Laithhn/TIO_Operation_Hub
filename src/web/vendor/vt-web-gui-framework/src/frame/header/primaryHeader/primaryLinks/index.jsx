import PropTypes from 'prop-types';
import {
  lazy, useState, useRef, useCallback, useEffect, Suspense,
} from 'react';
import { useSelector } from 'react-redux';

import { selectors } from 'store';

import Marker from './marker';
import PrimaryLink from './primaryLink';
import css from './primaryLinks.scss';

// load the following optional components lazily to reduce the size of the bundle
const MegaMenu = lazy(() => import('./megaMenu'));


/**
 * React component of the primary section of the header that includes the links of the 1st menu
 * level of the primary menu nodes. There are two ways to present these links: for default menu
 * appearance and for mega menu appearance.
 */
const PrimaryLinks = ({ isMegaMenu }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const isActiveMenuNode = useSelector(selectors.menus.primaryMenu.isActiveMenuNode);
  const primaryMenuNodesOf1stLevel = useSelector(selectors.menus.primaryMenu.getMenuNodesOf1stLevel);

  const [activeMenuNodeDims, setActiveMenuNodeDims] = useState({ menuNodeId: null, relPosX: 0, width: 0 });
  const [megaMenuData, setMegaMenuData] = useState({
    show: false, menuNodeId: null, absPosX: 0, width: 0,
  });

  const primaryLinksRef = useRef();
  const megaMenuRef = useRef();


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
   *
   */
  const handleActive = useCallback(({ menuNodeId, relPosX, width }) => {
    setActiveMenuNodeDims((prevValue) => (((menuNodeId !== prevValue.menuNodeId) || (relPosX !== prevValue.relPosX) || (width !== prevValue.width))
      ? { menuNodeId, relPosX, width }
      : prevValue
    ));
  }, []);


  /**
   *
   */
  const handleClickPrimaryLink = useCallback(({ menuNodeId, absPosX, width }) => {
    setMegaMenuData((prevValue) => ({
      show: !prevValue.show || (menuNodeId !== prevValue.menuNodeId),
      menuNodeId,
      absPosX,
      width,
    }));
  }, []);


  /**
   *
   */
  const handleCloseMegaMenu = useCallback(() => {
    setMegaMenuData((prevValue) => (prevValue.show
      ? { ...prevValue, show: false }
      : prevValue
    ));
  }, []);


  /**
   * Memoized handler for native event "pointerdown" on the window element. Call prop
   * handleCloseMegaMenu, if
   * a) the target of the event is inside the root container (but not a primary link), or
   * b) the target of the event is inside the temporary container like the mega menu, but below
   *    this in the DOM hierarchy.
   */
  const handleWindowPointerDown = useCallback((event) => {
    if (
      megaMenuRef.current
      && !megaMenuRef.current.contains(event.target)
      && !primaryLinksRef.current.contains(event.target)
    ) {
      if (document.getElementById(process.env.ELEM_ID_ROOT).contains(event.target)) {
        event.preventDefault(); // otherwise text selection works
        handleCloseMegaMenu();
      } else {
        const tempChildren = document.getElementById(process.env.ELEM_ID_TEMP).children;

        for (let i = 0; i < tempChildren.length; i++) {
          if (tempChildren[i].contains(event.target)) {
            event.preventDefault(); // otherwise text selection works
            handleCloseMegaMenu();
            break;
          } else if (tempChildren[i].contains(megaMenuRef.current)) {
            break;
          }
        }
      }
    }
  }, [handleCloseMegaMenu]);


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

    setMegaMenuData((prevValue) => (prevValue.show
      ? { ...prevValue, show: false }
      : prevValue
    ));

    return undefined;
  }, [isMegaMenu, handleWindowPointerDown]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <div
      ref={primaryLinksRef}
      className={css.primaryLinks}
    >
      {!isMegaMenu && isActiveMenuNode && (
        <Marker
          id={activeMenuNodeDims.menuNodeId}
          posX={activeMenuNodeDims.relPosX}
          width={activeMenuNodeDims.width}
        />
      )}
      {primaryMenuNodesOf1stLevel.map((menuNode) => (
        <PrimaryLink
          key={menuNode.id}
          menuNode={menuNode}
          ignoreActiveMenuTree={isMegaMenu}
          onActive={handleActive}
          {...(isMegaMenu && { onClick: handleClickPrimaryLink })}
        />
      ))}
      <Suspense fallback={null}>
        {isMegaMenu && (
          <MegaMenu
            ref={megaMenuRef}
            id={megaMenuData.menuNodeId}
            markerPosX={megaMenuData.absPosX + (megaMenuData.width / 2)}
            show={megaMenuData.show}
            onClose={handleCloseMegaMenu}
          />
        )}
      </Suspense>
    </div>
  );
  //                                                                                  </editor-fold>
};

PrimaryLinks.displayName = 'PrimaryLinks';

PrimaryLinks.propTypes = {
  isMegaMenu: PropTypes.bool,
};

PrimaryLinks.defaultProps = {
  isMegaMenu: false,
};

export default PrimaryLinks;
