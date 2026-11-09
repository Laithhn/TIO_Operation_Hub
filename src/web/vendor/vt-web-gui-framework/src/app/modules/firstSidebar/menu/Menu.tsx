import {
  useCallback, useEffect, useRef, useState,
} from 'react';

import { layout } from 'assets/styles';
import { ScrollButton } from 'components/helpers/scrollButton';
import { useDimensions } from 'components/hooks/useDimensions';
import { useScrollHandlers } from 'components/hooks/useScrollHandlers';
import { type PrimaryMenuNode } from 'store/menus/primaryMenu';
import { scrollTopDiff } from 'utils/scroll';

import { Marker } from '../marker/Marker';

import * as css from './menu.scss';
import type { MenuProps } from './menu.types';
import { MenuNode } from './menuNode/MenuNode';


/**
 * React component of the field with the primary submenu inside the first sidebar.
 */
const Menu = ({ menuNodes, levelOfActiveMenuNode }: MenuProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [showScrollButtonUp, setShowScrollButtonUp] = useState(false);
  const [showScrollButtonDown, setShowScrollButtonDown] = useState(false);
  const [activeMenuNodeCenterPosY, setActiveMenuNodeCenterPosY] = useState<number>(0);

  const menuRef = useRef<HTMLDivElement>(null);
  const menuNodesHeightsRef = useRef<Record<PrimaryMenuNode['id'], number>>({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { clientHeight, scrollHeight } = useDimensions({ ref: menuRef });

  const isAnySubmenuNodeActive = (levelOfActiveMenuNode >= 2);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to deside whether the vertical scroll buttons have to be shown
   * or not.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const setVisibilityScrollButtons = useCallback(() => {
    const enableScrolling = ((scrollHeight ?? 0) > (clientHeight ?? 0));
    const scrollTop = menuRef.current?.scrollTop ?? 0;

    setShowScrollButtonUp(enableScrolling && (scrollTop > 0));
    setShowScrollButtonDown(enableScrolling && (scrollTop < ((scrollHeight ?? 0) - (clientHeight ?? 0))));
  }, [clientHeight, scrollHeight]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the callback prop "onSetHeight" of the sub-component "MenuNode" to store the height
   * of an entry, that is directly rendered here in the primary submenu.
   */
  const handleSetHeight: React.ComponentProps<typeof MenuNode>['onSetHeight'] = (id, height) => {
    menuNodesHeightsRef.current[id] = height;
  };


  /**
   * Handler for the callback prop "onActive" of the sub-component "MenuNode" to signalize, that one
   * of the entries (or anything inside them) becomes active. Take the given internal offset of this
   * node, add the height of all entries above of it and set this position as center position for
   * the marker.
   */
  const handleActive: React.ComponentProps<typeof MenuNode>['onActive'] = (id, offset) => {
    let pos = offset;

    for (const menuNode of menuNodes) {
      if (menuNode.id === id) {
        break;
      }
      pos += (menuNodesHeightsRef.current[menuNode.id] ?? 0);
    }

    setActiveMenuNodeCenterPosY(pos);
  };


  /**
   *
   */
  const scrollHandlersProps = useScrollHandlers<HTMLDivElement>({
    enableWheel: true,
    enableTouch: true,
    onChangeY: ({ diff }) => {
      if (menuRef.current) {
        scrollTopDiff(menuRef.current, diff, {
          callback: setVisibilityScrollButtons,
        });
      }
    },
  });


  /*
   * Handler for the callback prop "onClick" of the helper component "ScrollButton" to scroll
   * vertical by clicking one of the scroll buttons for scrolling up or down.
   */
  const handleClickScrollButton: React.ComponentProps<typeof ScrollButton>['onClick'] = ({ dir }) => {
    if (menuRef.current) {
      scrollTopDiff(
        menuRef.current,
        ((dir === 'down') ? (clientHeight ?? 0) : -(clientHeight ?? 0)) / 3 * 2,
        {
          easing: 'easeInOutQuad',
          callback: setVisibilityScrollButtons,
        },
      );
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    setVisibilityScrollButtons();
  }, [setVisibilityScrollButtons]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <div className={css.menuWrapper}>
      <div
        ref={menuRef}
        className={css.menu}
        {...scrollHandlersProps}
      >
        {menuNodes.map((menuNode) => (
          <MenuNode
            key={menuNode.id}
            menuNode={menuNode}
            onSetHeight={handleSetHeight}
            onActive={handleActive}
          />
        ))}
        <Marker centerPosY={isAnySubmenuNodeActive ? activeMenuNodeCenterPosY : 0} />
      </div>
      <ScrollButton
        dir="up"
        pos="end"
        show={showScrollButtonUp}
        showShader
        shaderColor={layout.firstSidebar.background}
        holdable
        onClick={handleClickScrollButton}
      />
      <ScrollButton
        dir="down"
        pos="end"
        show={showScrollButtonDown}
        showShader
        shaderColor="paleGray"
        holdable
        onClick={handleClickScrollButton}
      />
    </div>
  );
  //                                                                                  </editor-fold>
};

Menu.displayName = 'Menu';


export { Menu };
