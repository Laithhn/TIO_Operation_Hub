import PropTypes from 'prop-types';
import {
  Children, cloneElement, useState, useRef, useCallback, useEffect,
} from 'react';

import Enums from 'assets/enums';
import {
  ScrollButton, useScrollHandlers, convertScrollLeft, scrollTopTo, scrollTopDiff, scrollLeftTo,
  scrollLeftDiff,
} from 'components/helpers/scrolling';
import scrollingDefines from 'components/helpers/scrolling/defines';
import useDimensions from 'components/hooks/useDimensions';
import useStylingProps from 'components/hooks/useStylingProps';
import { hooks } from 'store';
import classNames from 'utils/classNames';

import Marker from './marker';
import TabBarContrItem from './tabBarContrItem';
import TabBarTitleItem from './tabBarTitleItem';
import stylingProps from './stylingProps';
import css from './tabBar.scss';


const scrollButtonDim = scrollingDefines.scrollButton.dim;


/**
 * Helper function to convert the left offset value of a tab in dependence of the text direction.
 * This is necessary because native "offsetLeft" is always the distance from the left side of the
 * parent element (inner tab bar container) to the left side of the tab element at a scroll offset
 * of 0. The returned value is always the positive distance from the beginning of the tab list to
 * the nearest side of the tab element.
 */
const convertOffsetLeft = (offsetLeft, tabWidth, dimVisible, isRtl) => (isRtl
  ? dimVisible - offsetLeft - tabWidth
  : offsetLeft
);


/**
 * React component of a tab bar that renders a list of components TabBarTitleItem or
 * TabBarContrItem.
 */
const TabBar = ({
  pos, selectedId, backgroundMarker, markerColor, children, ...restProps
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = hooks.useI18n();

  const [markerOffsetAndDim, setMarkerOffsetAndDim] = useState({ offset: null, dim: null, animation: false });
  const [showScrollButtonStart, setShowScrollButtonStart] = useState(false);
  const [showScrollButtonEnd, setShowScrollButtonEnd] = useState(false);

  const tabBarRef = useRef();
  const tabBarItemIdsRef = useRef([]);
  const tabBarItemsRef = useRef({});
  const prevsRef = useRef({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle, hasDarkBackground } = useStylingProps(restProps, stylingProps);
  const isVertical = (pos === Enums.Position.LEFT) || (pos === Enums.Position.RIGHT);
  let dimVisible, dimTotal, modMarkerColor, hasDarkBackgroundMarker;

  const {
    clientWidth, scrollWidth, clientHeight, scrollHeight,
  } = useDimensions(tabBarRef);

  if (isVertical) {
    dimVisible = clientHeight;
    dimTotal = scrollHeight;
  } else {
    dimVisible = clientWidth;
    dimTotal = scrollWidth;
  }

  // change default value null to a real color, depending on flag backgroundMarker
  if (backgroundMarker) {
    modMarkerColor = (markerColor instanceof Enums.BackgroundColor) ? markerColor : Enums.BackgroundColor.OFF_WHITE;
    hasDarkBackgroundMarker = modMarkerColor.darkTheme;
  } else {
    modMarkerColor = (markerColor instanceof Enums.MarkerColor) ? markerColor : Enums.MarkerColor.ATTENTION;
    hasDarkBackgroundMarker = false;
  }

  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to deside whether the scroll buttons have to be shown or not.
   */
  const setVisibilityScrollButtons = useCallback(() => {
    const enableScrolling = (dimTotal > dimVisible);
    const scrollOffset = isVertical
      ? tabBarRef.current.scrollTop
      : convertScrollLeft(dimVisible, dimTotal, tabBarRef.current.scrollLeft, isRtl);

    setShowScrollButtonStart(enableScrolling && (scrollOffset > 0));
    setShowScrollButtonEnd(enableScrolling && (scrollOffset < (dimTotal - dimVisible)));
  }, [isRtl, isVertical, dimVisible, dimTotal]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const createRefs = (element, id) => {
    tabBarItemsRef.current[id] = element;
  };


  /**
   *
   */
  const scrollHandlersProps = useScrollHandlers({
    enableWheel: true,
    enableTouch: true,
    onChangeX: useCallback((delta) => {
      scrollLeftDiff(tabBarRef.current, delta, {
        isRtl,
        callback: setVisibilityScrollButtons,
      });
    }, [isRtl, setVisibilityScrollButtons]),
    onChangeY: useCallback((delta) => {
      scrollTopDiff(tabBarRef.current, delta, {
        callback: setVisibilityScrollButtons,
      });
    }, [setVisibilityScrollButtons]),
  });


  /*
   * Event handler: scrolling vertical by clicking one of the scroll buttons for scrolling up or
   * down.
   */
  const handleClickScrollButton = useCallback(({ dir }) => {
    const index = ((dir === 'right') || (dir === 'down')) ? 1 : -1;
    const scrollOffset = isVertical
      ? tabBarRef.current.scrollTop
      : convertScrollLeft(dimVisible, dimTotal, tabBarRef.current.scrollLeft, isRtl);

    if (index < 0) {
      for (let i = (tabBarItemIdsRef.current.length - 1); i >= 0; i--) {
        const id = tabBarItemIdsRef.current[i];
        const { offset: rawOffset, dim } = tabBarItemsRef.current[id].getPosition(isVertical);
        const offset = isVertical ? rawOffset : convertOffsetLeft(rawOffset, dim, dimVisible, isRtl);

        if (
          (offset < scrollOffset)
          && (
            (i === 0)
            || ((scrollOffset - offset) > (dim / 2))
          )
        ) {
          (isVertical ? scrollTopTo : scrollLeftTo)(tabBarRef.current, offset, {
            isRtl,
            easing: 'easeInOutQuad',
            callback: setVisibilityScrollButtons,
          });

          break;
        }
      }
    } else if (index > 0) {
      for (let i = 0; i < tabBarItemIdsRef.current.length; i++) {
        const id = tabBarItemIdsRef.current[i];
        const { offset: rawOffset, dim } = tabBarItemsRef.current[id].getPosition(isVertical);
        const offset = isVertical ? rawOffset : convertOffsetLeft(rawOffset, dim, dimVisible, isRtl);

        if ((offset + dim) > (scrollOffset + dimVisible)) {
          (isVertical ? scrollTopTo : scrollLeftTo)(tabBarRef.current, offset + dim - dimVisible, {
            isRtl,
            easing: 'easeInOutQuad',
            callback: setVisibilityScrollButtons,
          });

          break;
        }
      }
    }
  }, [isRtl, isVertical, dimVisible, dimTotal, setVisibilityScrollButtons]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // Effect to a) automatically scroll to the selected tab, if some conditions changes (e.g. adding
  // or removing of tabs, changing of the content width or height and so on). And b) set the positon
  // and the dimension of the marker to the selected tab.
  useEffect(() => {
    if ((dimVisible > 0) && (dimTotal > 0) && tabBarItemsRef.current[selectedId]) {
      const scrollOffset = isVertical
        ? tabBarRef.current.scrollTop
        : convertScrollLeft(dimVisible, dimTotal, tabBarRef.current.scrollLeft, isRtl);

      const { offset: rawOffset, dim } = tabBarItemsRef.current[selectedId].getPosition(isVertical);
      const offset = isVertical ? rawOffset : convertOffsetLeft(rawOffset, dim, dimVisible, isRtl);
      const scrollOffsetMin = Math.max(0, (offset - scrollButtonDim));
      const scrollOffsetMax = Math.min(dimTotal, (offset + dim + scrollButtonDim));

      if (scrollOffset > scrollOffsetMin) {
        (isVertical ? scrollTopTo : scrollLeftTo)(tabBarRef.current, scrollOffsetMin, {
          isRtl,
          easing: 'easeInOutQuad',
          callback: setVisibilityScrollButtons,
        });
      } else if ((scrollOffset + dimVisible) < scrollOffsetMax) {
        (isVertical ? scrollTopTo : scrollLeftTo)(tabBarRef.current, scrollOffsetMax - dimVisible, {
          isRtl,
          easing: 'easeInOutQuad',
          callback: setVisibilityScrollButtons,
        });
      }

      const animation = (
        (selectedId !== prevsRef.current.selectedId)
      );
      prevsRef.current.selectedId = selectedId;

      setMarkerOffsetAndDim((prevValue) => (
        ((offset === prevValue.offset) && (dim === prevValue.dim))
          ? prevValue
          : { offset: isRtl ? -offset : offset, dim, animation }
      ));
    } else {
      setMarkerOffsetAndDim((prevValue) => (
        ((prevValue.offset === null) && (prevValue.dim === null))
          ? prevValue
          : { offset: null, dim: null, animation: false }
      ));
    }
  }, [selectedId, children, isRtl, isVertical, dimVisible, dimTotal, setVisibilityScrollButtons]);


  // Effect to deside, if the scroll buttons has to be shown or not in dependence of some conditions
  // like the width or height of the scroll container.
  useEffect(() => {
    setVisibilityScrollButtons();
  }, [setVisibilityScrollButtons]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  tabBarItemIdsRef.current = [];

  const tabBarClasses = classNames(css.tabBar, {
    [css.isOverflow]: (dimTotal > dimVisible),
    [css.isVertical]: isVertical,
  });

  return (
    <div className={css.tabBarWrapper} style={outerElemStyle}>
      <div
        ref={tabBarRef}
        role="tablist"
        className={tabBarClasses}
        {...scrollHandlersProps}
      >
        <Marker
          isRtl={isRtl}
          pos={pos}
          offset={markerOffsetAndDim.offset}
          dim={markerOffsetAndDim.dim}
          animation={markerOffsetAndDim.animation}
          backgroundMarker={backgroundMarker}
          color={modMarkerColor}
        />
        {
          Children.map(children, (child) => {
            if (![TabBarTitleItem, TabBarContrItem].includes(child?.type)) {
              return null;
            }

            const itemId = child.props.id;
            tabBarItemIdsRef.current.push(itemId);

            return cloneElement(
              child,
              {
                ...child.props,
                ref: (element) => createRefs(element, itemId),
                darkTheme: hasDarkBackground || (hasDarkBackgroundMarker && (itemId === selectedId)),
              },
            );
          })
        }
      </div>
      <ScrollButton
        dir={((pos === Enums.Position.TOP) || (pos === Enums.Position.BOTTOM)) ? 'left' : 'up'}
        pos={((pos === Enums.Position.TOP) || (pos === Enums.Position.LEFT)) ? 'start' : 'end'}
        show={showScrollButtonStart}
        showShader
        backgroundColor={restProps.backgroundColor}
        holdable
        onClick={handleClickScrollButton}
      />
      <ScrollButton
        dir={((pos === Enums.Position.TOP) || (pos === Enums.Position.BOTTOM)) ? 'right' : 'down'}
        pos={((pos === Enums.Position.TOP) || (pos === Enums.Position.LEFT)) ? 'start' : 'end'}
        show={showScrollButtonEnd}
        showShader
        backgroundColor={restProps.backgroundColor}
        holdable
        onClick={handleClickScrollButton}
      />
    </div>
  );
  //                                                                                  </editor-fold>
};

TabBar.displayName = 'TabBar';

TabBar.propTypes = {
  pos: PropTypes.instanceOf(Enums.Position),
  selectedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  backgroundMarker: Marker.propTypes.backgroundMarker,
  markerColor: PropTypes.oneOfType([PropTypes.instanceOf(Enums.MarkerColor), PropTypes.instanceOf(Enums.BackgroundColor)]),
  children: PropTypes.node,
};

TabBar.defaultProps = {
  pos: Enums.Position.TOP,
  selectedId: null,
  backgroundMarker: Marker.defaultProps.backgroundMarker,
  markerColor: null,
  children: null,
};

export { TabBarTitleItem, TabBarContrItem };
export default TabBar;
