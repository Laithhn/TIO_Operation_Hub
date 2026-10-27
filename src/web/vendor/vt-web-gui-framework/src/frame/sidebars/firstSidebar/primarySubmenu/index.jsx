import PropTypes from 'prop-types';
import {
  useRef, useState, useCallback, useEffect,
} from 'react';

import defines from 'assets/defines';
import { ScrollButton, useScrollHandlers, scrollTopDiff } from 'components/helpers/scrolling';
import useDimensions from 'components/hooks/useDimensions';

import Marker from '../marker';
import Entry from './entry';
import css from './primarySubmenu.scss';


/**
 * React component of the field with the primary submenu inside the first sidebar.
 */
const PrimarySubmenu = ({ menuNodes, levelOfActiveMenuNode }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [showScrollButtonUp, setShowScrollButtonUp] = useState(false);
  const [showScrollButtonDown, setShowScrollButtonDown] = useState(false);
  const [activeEntryCenterPosY, setActiveEntryCenterPosY] = useState(null);

  const primarySubmenuRef = useRef();
  const entriesHeightsRef = useRef({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { clientHeight, scrollHeight } = useDimensions(primarySubmenuRef);

  const isAnySubmenuNodeActive = (levelOfActiveMenuNode >= 2);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to deside whether the vertical scroll buttons have to be shown or not.
   */
  const setVisibilityScrollButtons = useCallback(() => {
    const enableScrolling = (scrollHeight > clientHeight);
    const { scrollTop } = primarySubmenuRef.current;

    setShowScrollButtonUp(enableScrolling && (scrollTop > 0));
    setShowScrollButtonDown(enableScrolling && (scrollTop < (scrollHeight - clientHeight)));
  }, [clientHeight, scrollHeight]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler to store the height of an entry, that is directly rendered here in the primary submenu.
   */
  const handleSetHeight = useCallback((id, height) => {
    entriesHeightsRef.current[id] = height;
  }, []);


  /**
   * Handler to signalize, that one of the entries (or anything inside them) becomes active. Take
   * the given internal offset of this node, add the height of all entries above of it and set this
   * position as center position for the marker.
   */
  const handleActive = useCallback((id, offset) => {
    let pos = offset;

    for (let i = 0; i < menuNodes.length; i++) {
      if (menuNodes[i].id === id) {
        break;
      }
      pos += (entriesHeightsRef.current[menuNodes[i].id] ?? 0);
    }

    setActiveEntryCenterPosY(pos);
  }, [menuNodes]);


  /**
   *
   */
  const scrollHandlersProps = useScrollHandlers({
    enableWheel: true,
    enableTouch: true,
    onChangeY: useCallback((delta) => {
      scrollTopDiff(primarySubmenuRef.current, delta, {
        callback: setVisibilityScrollButtons,
      });
    }, [setVisibilityScrollButtons]),
  });


  /*
   * Event handler: scrolling vertical by clicking one of the scroll buttons for scrolling up or
   * down.
   */
  const handleClickScrollButton = useCallback(({ dir }) => {
    scrollTopDiff(
      primarySubmenuRef.current,
      ((dir === 'down') ? clientHeight : -clientHeight) / 3 * 2,
      {
        easing: 'easeInOutQuad',
        callback: setVisibilityScrollButtons,
      },
    );
  }, [clientHeight, setVisibilityScrollButtons]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    setVisibilityScrollButtons();
  }, [setVisibilityScrollButtons]);


  // Effect to reset the center position for the marker, if no entry is active.
  useEffect(() => {
    if (!isAnySubmenuNodeActive) {
      setActiveEntryCenterPosY(null);
    }
  }, [isAnySubmenuNodeActive]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <div className={css.primarySubmenuWrapper}>
      <div
        ref={primarySubmenuRef}
        className={css.primarySubmenu}
        {...scrollHandlersProps}
      >
        {menuNodes.map((menuNode) => (
          <Entry
            key={menuNode.id}
            menuNode={menuNode}
            onSetHeight={handleSetHeight}
            onActive={handleActive}
          />
        ))}
        <Marker centerPosY={activeEntryCenterPosY} />
      </div>
      <ScrollButton
        dir="up"
        pos="end"
        show={showScrollButtonUp}
        showShader
        backgroundColor={defines.layout.sidebars.background}
        holdable
        onClick={handleClickScrollButton}
      />
      <ScrollButton
        dir="down"
        pos="end"
        show={showScrollButtonDown}
        showShader
        backgroundColor={defines.layout.sidebars.background}
        holdable
        onClick={handleClickScrollButton}
      />
    </div>
  );
  //                                                                                  </editor-fold>
};

PrimarySubmenu.displayName = 'PrimarySubmenu';

PrimarySubmenu.propTypes = {
  menuNodes: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
  })),
  levelOfActiveMenuNode: PropTypes.number,
};

PrimarySubmenu.defaultProps = {
  menuNodes: [],
  levelOfActiveMenuNode: 0,
};

export default PrimarySubmenu;
