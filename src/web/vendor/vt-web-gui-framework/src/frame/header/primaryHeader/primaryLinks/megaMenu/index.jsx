import PropTypes from 'prop-types';
import {
  forwardRef, useState, useRef, useCallback, useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';

import Enums from 'assets/enums';
import {
  ScrollBar, useScrollHandlers, scrollTopTo, scrollTopDiff,
} from 'components/helpers/scrolling';
import useFadeInOut from 'components/hooks/useFadeInOut';
import { selectors } from 'store';
import classNames from 'utils/classNames';

import Marker from './marker';
import PrimaryMenuPart from './primaryMenuPart';
import megaMenuDefines from './defines';
import css from './megaMenu.scss';


const defaultDims = {
  clientHeight: 0,
  scrollHeight: 0,
  scrollTop: 0,
};


/**
 * React component of the hamburger menu icon with a mega menu.
 */
const MegaMenu = forwardRef(({
  id, markerPosX, show, onClose,
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const submenuNodes = useSelector((state) => selectors.menus.primaryMenu.getVisibleSubmenuNodesById(state, id)) ?? [];

  const [dims, setDims] = useState(defaultDims);
  const [showScrollBar, setShowScrollBar] = useState(false);

  const innerCntrRef = useRef();
  const timeoutRef = useRef();
  const prevsRef = useRef({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Function to set the dimensions of the given container to the internal state.
   */
  const deriveDims = useCallback(() => {
    setDims((prevDims) => {
      const { clientHeight, scrollHeight, scrollTop } = innerCntrRef?.current ?? defaultDims;

      return (
        (clientHeight === prevDims.clientHeight)
        && (scrollHeight === prevDims.scrollHeight)
        && (scrollTop === prevDims.scrollTop)
      )
        ? prevDims
        : { clientHeight, scrollHeight, scrollTop };
    });
  }, []);


  /**
   * Memoized helper function to overtake the current values of scrollTop from the scrolling
   * container to the internal state, if it changes.
   */
  const handleSetScrollPosition = useCallback(() => {
    setDims((prevValue) => {
      const { scrollTop } = innerCntrRef.current;
      return (scrollTop !== prevValue.scrollTop) ? { ...prevValue, scrollTop } : prevValue;
    });
  }, []);


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
      scrollTopDiff(innerCntrRef.current, delta, {
        callback: handleSetScrollPosition,
      });
    }, [handleSetScrollPosition]),
  });


  /*
   * Event handler: scrolling vertical by moving the scroll bar handle.
   */
  const handleScrollByScrollBar = useCallback((value, diff, event) => {
    scrollTopTo(innerCntrRef.current, value, {
      ...((event.type !== 'pointerdown') && { duration: 0 }),
      easing: 'easeInOutQuad',
      callback: handleSetScrollPosition,
    });
  }, [handleSetScrollPosition]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  const { visibilityState } = useFadeInOut((show), {
    fadeInTimeMs: megaMenuDefines.animationTimeMs,
    fadeOutTimeMs: megaMenuDefines.animationTimeMs,
  });


  useEffect(() => {
    if (id && (id !== prevsRef.current.id)) {
      setDims((prevValue) => (
        (prevValue.scrollTop !== 0) ? { ...prevValue, scrollTop: 0 } : prevValue
      ));

      setShowScrollBar(false);
      timeoutRef.current = setTimeout(() => {
        deriveDims();
        setShowScrollBar(true);
      }, megaMenuDefines.animationTimeMs * 1.2);

      prevsRef.current.id = id;

      return () => {
        clearTimeout(timeoutRef.current);
      };
    }

    return undefined;
  }, [id, deriveDims]);


  useEffect(() => {
    document.addEventListener('domChange', deriveDims);
    deriveDims();

    return () => {
      document.removeEventListener('domChange', deriveDims);
    };
  }, [deriveDims]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (visibilityState === Enums.Visibility.HIDE) {
    return null;
  }


  const megaMenuClasses = classNames(css.megaMenu, {
    [css.show]: (visibilityState === Enums.Visibility.FADE_IN) || (visibilityState === Enums.Visibility.SHOW),
  });

  const megaMenuStyle = {
    ...(dims.scrollHeight && { height: `${dims.scrollHeight}px` }),
  };

  return createPortal(
    <>
      <div className={css.outerContr}>
        <div
          ref={ref}
          className={megaMenuClasses}
          style={megaMenuStyle}
        >
          <div
            ref={innerCntrRef}
            className={css.innerContr}
            {...scrollHandlersProps}
          >
            {submenuNodes.map((menuNode) => (
              <PrimaryMenuPart
                key={menuNode.id}
                menuNode={menuNode}
                onClose={onClose}
              />
            ))}
          </div>
          {showScrollBar && (
            <ScrollBar
              dimVisible={dims.clientHeight}
              dimTotal={dims.scrollHeight}
              scrollOffset={dims.scrollTop}
              onScroll={handleScrollByScrollBar}
            />
          )}
        </div>
      </div>
      <Marker
        centerPosX={markerPosX}
        fadeIn={(visibilityState === Enums.Visibility.FADE_IN) || (visibilityState === Enums.Visibility.SHOW)}
        fadeOut={visibilityState === Enums.Visibility.FADE_OUT}
      />
    </>,
    document.getElementById(process.env.ELEM_ID_TEMP),
  );
  //                                                                                  </editor-fold>
});

MegaMenu.displayName = 'MegaMenu';

MegaMenu.propTypes = {
  id: PropTypes.string,
  show: PropTypes.bool,
  markerPosX: PropTypes.number,
  onClose: PropTypes.func,
};

MegaMenu.defaultProps = {
  id: null,
  show: false,
  markerPosX: 0,
  onClose() {},
};

export default MegaMenu;
