import PropTypes from 'prop-types';
import {
  useState, useRef, useCallback, useEffect,
} from 'react';

import defines from 'assets/defines';
import { ScrollButton, useScrollHandlers, scrollTopDiff } from 'components/helpers/scrolling';
import useDimensions from 'components/hooks/useDimensions';

import MenuList from './menuList';
import css from './menuLists.scss';


/**
 * React component of ...
 */
const MenuLists = ({ parentMenuNodeId, onClickLink }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [showScrollButtonUp, setShowScrollButtonUp] = useState(false);
  const [showScrollButtonDown, setShowScrollButtonDown] = useState(false);

  const scrollContrRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { clientHeight, scrollHeight } = useDimensions(scrollContrRef);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to deside whether the vertical scroll buttons have to be shown or not.
   */
  const setVisibilityScrollButtons = useCallback(() => {
    const enableScrolling = (scrollHeight > clientHeight);
    const { scrollTop } = scrollContrRef.current;

    setShowScrollButtonUp(enableScrolling && (scrollTop > 0));
    setShowScrollButtonDown(enableScrolling && (scrollTop < (scrollHeight - clientHeight)));
  }, [clientHeight, scrollHeight]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const scrollHandlersProps = useScrollHandlers({
    enableWheel: true,
    enableTouch: true,
    onChangeY: useCallback((delta) => {
      scrollTopDiff(scrollContrRef.current, delta, {
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
      scrollContrRef.current,
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


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <div className={css.menuLists}>
      <div
        ref={scrollContrRef}
        className={css.scrollContr}
        {...scrollHandlersProps}
      >
        <MenuList
          parentMenuNodeId={parentMenuNodeId}
          onClickLink={onClickLink}
        />
        <MenuList
          parentMenuNodeId={parentMenuNodeId}
          isSecondaryMenu
          onClickLink={onClickLink}
        />
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

MenuLists.displayName = 'MenuLists';

MenuLists.propTypes = {
  parentMenuNodeId: PropTypes.string,
  onClickLink: PropTypes.func,
};

MenuLists.defaultProps = {
  parentMenuNodeId: null,
  onClickLink() {},
};

export default MenuLists;
