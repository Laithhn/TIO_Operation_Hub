import { useCallback, useEffect, useRef } from 'react';

import { NavigationLink, type NavigationLinkProps } from 'components/helpers/navigationLink';
import { useI18n } from 'components/hooks/useI18n';
import { useSelector } from 'components/hooks/useSelector';
import { primaryMenuSlice } from 'store/menus/primaryMenu';
import { classNames } from 'utils/classNames';

import * as css from './menuNode.scss';
import type { MenuNodeProps } from './menuNode.types';


/**
 * React sub-component of the app module "Header" to render a link of a menu node in the primary
 * section of the header.
 */
const MenuNode = ({
  menuNode, suppressNavigationIfActive, onActive, onClick,
}: MenuNodeProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = useI18n();

  const isActive = useSelector((state) => primaryMenuSlice.selectIsIdPartOfActiveMenuTree(state, menuNode.id));

  const navigationLinkRef = useRef<HTMLAnchorElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const caption = translateText(menuNode.caption ?? '');
  // the framework's HTML ID of the node, carried by whichever element stands for its link
  const elemId = `viwgf_primaryHeader_${menuNode.id}`;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the callback prop "onClick" of the helper component "NavigationLink".
   */
  const handleClick: NonNullable<NavigationLinkProps['onClick']> = () => {
    onClick?.({ menuNodeId: menuNode.id });
  };


  /**
   * Handler for the custom event "domChange" of the document to call prop
   * "onActive" with the current position and dimension of the navigation link if it is active.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const handleDomChange = useCallback(() => {
    if (navigationLinkRef.current) {
      onActive({
        menuNodeId: menuNode.id,
        relPosX: navigationLinkRef.current.offsetLeft,
        width: navigationLinkRef.current.clientWidth,
      });
    }
  }, [menuNode.id, onActive]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (isActive) {
      document.addEventListener('domChange', handleDomChange);

      return () => {
        document.removeEventListener('domChange', handleDomChange);
      };
    }

    return undefined;
  }, [isActive, handleDomChange]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  // The node that is part of the active menu tree is the one the marker covers (see MenuNodes.tsx),
  // and the class says so to the stylesheet: where the marker lies, the interaction veil stays out.
  const menuNodeClasses = classNames(css.menuNode, { [css.active]: isActive });

  if (menuNode.isDisabled) {
    return (
      <span id={elemId} className={css.disabledMenuNode}>{caption}</span>
    );
  }


  if (suppressNavigationIfActive && isActive) {
    return (
      <span
        ref={navigationLinkRef}
        id={elemId}
        role="link"
        tabIndex={0}
        className={menuNodeClasses}
        onClick={handleClick}
        onKeyDown={undefined}
        onKeyUp={undefined}
      >
        {caption}
      </span>
    );
  }


  return (
    <NavigationLink
      ref={navigationLinkRef}
      id={elemId}
      className={menuNodeClasses}
      to={menuNode.urlPath}
      onClick={handleClick}
    >
      {caption}
    </NavigationLink>
  );
  //                                                                                  </editor-fold>
};

MenuNode.displayName = 'MenuNode';


export { MenuNode };
