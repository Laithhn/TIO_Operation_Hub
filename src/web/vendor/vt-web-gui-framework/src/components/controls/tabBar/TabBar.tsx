import {
  Children, isValidElement, useCallback, useImperativeHandle, useLayoutEffect, useRef, useState,
} from 'react';

import {
  type ColorKeys, getGround, space, type SpaceKeys,
} from 'assets/styles';
import { ScrollButton, type ScrollButtonProps, scrollButtonShaderDim } from 'components/helpers/scrollButton';
import { useDimensions } from 'components/hooks/useDimensions';
import { useI18n } from 'components/hooks/useI18n';
import { useScrollHandlers, type UseScrollHandlersProps } from 'components/hooks/useScrollHandlers';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';
import {
  convertScrollLeftOfElement, scrollLeftDiff, scrollLeftTo, scrollTopDiff, scrollTopTo,
} from 'utils/scroll';

import { Marker } from './marker/Marker';
import * as css from './tabBar.scss';
import {
  type TabBarItemHandle, type TabBarItemId, type TabBarPos, type TabBarProps, tabBarStylingProps,
} from './tabBar.types';
import { TabBarContrItem } from './tabBarContrItem/TabBarContrItem';
import type { TabBarContrItemProps } from './tabBarContrItem/tabBarContrItem.types';
import { TabBarTitleItem } from './tabBarTitleItem/TabBarTitleItem';
import type { TabBarTitleItemProps } from './tabBarTitleItem/tabBarTitleItem.types';


type TabBarItemProps = TabBarTitleItemProps | TabBarContrItemProps;
type TabBarItemElement = React.ReactElement<TabBarItemProps>;

/** Whether a child of the tab bar is one of its two tab items - the only children it renders. */
const isTabBarItem = (child: React.ReactNode): child is TabBarItemElement => (
  isValidElement(child) && ((child.type === TabBarTitleItem) || (child.type === TabBarContrItem))
);

/**
 * Helper function to convert the left offset of a tab in dependence of the text direction. The
 * native "offsetLeft" is always the distance from the left side of the scrolling list to the left
 * side of the tab at a scroll offset of zero; returned is the positive distance from the beginning
 * of the tab list to the nearest side of the tab.
 */
const convertOffsetLeft = (offsetLeft: number, tabWidth: number, dimVisible: number, isRtl: boolean): number => (
  isRtl ? (dimVisible - offsetLeft - tabWidth) : offsetLeft
);

/**
 * Helper function to build the inline style that rounds the two corners of the bar facing away from
 * its content: the top corners of a bar above its content, and so on. Logical corners, so that a
 * vertical bar keeps its outer side in a right-to-left document, where the bars swap sides (see
 * marker.scss). Empty without a radius.
 */
const getOuterCornerRadii = (pos: TabBarPos, borderRadius: SpaceKeys | undefined): React.CSSProperties => {
  if (!borderRadius) {
    return {};
  }

  const radiusPx = `${space[borderRadius]}px`;

  if (pos === 'top') {
    return { borderStartStartRadius: radiusPx, borderStartEndRadius: radiusPx };
  }
  if (pos === 'bottom') {
    return { borderEndStartRadius: radiusPx, borderEndEndRadius: radiusPx };
  }
  if (pos === 'left') {
    return { borderStartStartRadius: radiusPx, borderEndStartRadius: radiusPx };
  }

  return { borderStartEndRadius: radiusPx, borderEndEndRadius: radiusPx };
};

/** The marker's place along the bar: where it begins and how long it is, in pixels - both null
 * while no tab is selected or nothing is measured yet - and whether the move to this place
 * slides. */
interface MarkerPlace {
  offset: number | null;
  dim: number | null;
  animation: boolean;
}

const noMarkerPlace: MarkerPlace = { offset: null, dim: null, animation: false };


/**
 * React component of the control component "TabBar": a list of tabs - the sub-components
 * "TabBarTitleItem" and "TabBarContrItem" - along one edge of a content, with a marker on the
 * selected tab. It switches between the contents of one part of a content, as a rule a section
 * set off by its colour, and lies on one of that part's four edges (see the prop "pos"). Its two
 * appearances are two placements, chosen by the prop "backgroundMarker": by default the bar lies
 * in the part, on the part's colour, and a lens of glass marks the selected tab - the look of a
 * menu with a single level; with a background marker the bar stands at the part's edge, on the
 * surrounding ground, and the selected tab is filled in the part's colour - the look of the
 * classic tabs of a desktop program. Tabs that do not fit scroll, by touch, by the two scroll
 * buttons at the bar's ends, and by the wheel along the bar's own axis.
 */
const TabBar = ({
  ref, id, pos = 'top', selectedId = null, backgroundMarker = false, markerColor,
  children, ...restProps
}: TabBarProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = useI18n();

  const [markerPlace, setMarkerPlace] = useState<MarkerPlace>(noMarkerPlace);
  const [showScrollButtonStart, setShowScrollButtonStart] = useState(false);
  const [showScrollButtonEnd, setShowScrollButtonEnd] = useState(false);

  const wrapperElemRef = useRef<HTMLDivElement>(null);
  const tabBarElemRef = useRef<HTMLDivElement>(null);
  const itemHandlesRef = useRef<Record<TabBarItemId, TabBarItemHandle | null>>({});
  const prevSelectedIdRef = useRef<TabBarItemId | null | undefined>(undefined);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // The radius is the one styling prop held back from the hook: it rounds the two corners facing
  // away from the content rather than all four (below).
  const { borderRadius, ...stylingProps } = restProps;
  const { outerElemStyle } = useStylingProps(stylingProps, tabBarStylingProps);
  const isVertical = (pos === 'left') || (pos === 'right');
  const outerCornerRadii = getOuterCornerRadii(pos, borderRadius);

  const {
    clientWidth, scrollWidth, clientHeight, scrollHeight,
  } = useDimensions({ ref: tabBarElemRef });
  const dimVisible = (isVertical ? clientHeight : clientWidth) ?? 0;
  const dimTotal = (isVertical ? scrollHeight : scrollWidth) ?? 0;
  const isOverflow = (dimTotal > dimVisible);

  // The marker's colour, with the defaults the prop documents. The lens is tinted in "attention",
  // the colour that says which of several things is the one switched on (see colors.md) - v3 had
  // documented that default for its line and drawn none: it read the key's colour value where it
  // held only the key, so a marker without an explicit colour had no colour at all.
  const modMarkerColor: ColorKeys = markerColor ?? (backgroundMarker ? 'offWhite' : 'attention');
  // Every tab stands on the bar's ground and reads it by itself, with one exception: the tab a filled
  // marker covers stands on that marker, which is opaque, and follows its colour instead - lighter
  // or darker than the bar, and both cases occur. The lens is no such case, being a tint the bar's
  // ground reads through.
  const markerGround = getGround(modMarkerColor);

  // the tabs among the children, in their order - nothing else is rendered
  const items = Children.toArray(children).filter(isTabBarItem);
  const itemIds = items.map((item) => item.props.id);
  // A signature of the tabs, and a primitive on purpose: the children reach the bar as a new array
  // of new elements on every render of the consumer, so the tabs themselves are a new value every
  // time and an effect depending on them would run on every one of those renders. The effect below
  // scrolls the selected tab into view, which would then pull the bar back under the hands of a
  // user who had just scrolled somewhere else.
  const itemIdsKey = JSON.stringify(itemIds);
  // The tabs the keyboard travels: a disabled tab takes no focus, so the arrow keys pass it by.
  const enabledIds = items.filter((item) => (!item.props.disable)).map((item) => item.props.id);
  // The one tab the keyboard enters the bar at - a tab bar is one stop of the tab sequence and the
  // arrow keys travel inside it from there (the ARIA tabs pattern). It is the selected tab while
  // that tab can be used, and the first tab that can be used otherwise, so that a bar whose
  // selection is disabled or unset stays reachable.
  const keyboardEntryId = ((selectedId !== null) && enabledIds.includes(selectedId))
    ? selectedId
    : enabledIds[0];

  // Where the two scroll buttons sit along the shader they stand in, and that shader always runs
  // across the bar's own axis. Beside a vertical bar it is a strip over the bar's width, and there
  // the button follows the bar's edge, keeping to the side that faces away from the content. At the
  // ends of a horizontal bar it is a strip over the bar's height, and there only centring keeps the
  // button on the tab row: such a bar is barely taller than one tab, so a button aligned to either
  // end would overflow the strip rather than move within it.
  const posAlongVerticalBar: ScrollButtonProps['pos'] = (pos === 'left') ? 'start' : 'end';
  const scrollButtonPos: ScrollButtonProps['pos'] = isVertical ? posAlongVerticalBar : 'center';


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to read the scroll offset of the bar along its axis,
   * normalized to start at zero in either text direction. The conversion takes its measures from
   * the element itself rather than from the measured state, so that the three values it weighs
   * against each other are read at one moment: the state follows a document change and lags behind
   * a size change until then.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const getScrollOffset = useCallback((): number => {
    const elem = tabBarElemRef.current;

    if (!elem) {
      return 0;
    }

    return isVertical ? elem.scrollTop : convertScrollLeftOfElement(elem, isRtl);
  }, [isVertical, isRtl]);


  /**
   * Helper function to read where a tab begins along the bar's axis, from the
   * beginning of the tab list in either text direction, and how long it is.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const getItemPosition = useCallback((itemId: TabBarItemId): { offset: number; dim: number } | undefined => {
    const position = itemHandlesRef.current[itemId]?.getPosition(isVertical);

    return position && {
      offset: isVertical ? position.offset : convertOffsetLeft(position.offset, position.dim, dimVisible, isRtl),
      dim: position.dim,
    };
  }, [isVertical, dimVisible, isRtl]);


  /**
   * Helper function to show each scroll button exactly while there is something to scroll to in
   * its direction.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there. The two state setters stand in its dependencies although they never change: the React
   * Compiler infers them as dependencies, and without them it cannot preserve this memoization and
   * skips the whole component.
   */
  const setVisibilityScrollButtons = useCallback(() => {
    const scrollOffset = getScrollOffset();

    setShowScrollButtonStart(isOverflow && (scrollOffset > 0));
    setShowScrollButtonEnd(isOverflow && (scrollOffset < (dimTotal - dimVisible)));
  }, [getScrollOffset, isOverflow, dimTotal, dimVisible, setShowScrollButtonStart, setShowScrollButtonEnd]);


  /**
   * Helper function to scroll the bar to an absolute offset along its axis,
   * eased, with the scroll buttons following the movement.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const scrollTo = useCallback((to: number) => {
    if (tabBarElemRef.current) {
      (isVertical ? scrollTopTo : scrollLeftTo)(tabBarElemRef.current, to, {
        isRtl,
        easing: 'easeInOutQuad',
        callback: setVisibilityScrollButtons,
      });
    }
  }, [isVertical, isRtl, setVisibilityScrollButtons]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    clientLeft: wrapperElemRef.current?.clientLeft,
    clientWidth: wrapperElemRef.current?.clientWidth,
    clientTop: wrapperElemRef.current?.clientTop,
    clientHeight: wrapperElemRef.current?.clientHeight,
    getBoundingClientRect: () => wrapperElemRef.current?.getBoundingClientRect(),
  }), []);


  /**
   * React callback reference of the tabs, keeping the handle the bar measures each tab through.
   */
  const itemRefCallback: (
    itemId: TabBarItemId, handle: TabBarItemHandle | null,
  ) => (undefined | (() => void)) = (itemId, handle) => {
    if (!handle) {
      return undefined;
    }

    itemHandlesRef.current[itemId] = handle;

    return () => {
      itemHandlesRef.current[itemId] = null;
    };
  };


  /**
   * Handler for the callback prop of the hook "useScrollHandlers" that belongs to
   * the bar's own axis: scrolling by wheel or by touch.
   */
  const handleChangeScroll: NonNullable<UseScrollHandlersProps<HTMLDivElement>['onChangeX']> = ({ diff }) => {
    const elem = tabBarElemRef.current;

    if (!elem) {
      return;
    }

    if (isVertical) {
      scrollTopDiff(elem, diff, { callback: setVisibilityScrollButtons });
    } else {
      scrollLeftDiff(elem, diff, { isRtl, callback: setVisibilityScrollButtons });
    }
  };


  /**
   * Handler for the callback prop of the hook "useScrollHandlers" that belongs to
   * the axis across the bar: scrolling by wheel alone.
   */
  const handleChangeScrollAcross: NonNullable<UseScrollHandlersProps<HTMLDivElement>['onChangeX']> = (args) => {
    if (args.event.type === 'wheel') {
      handleChangeScroll(args);
    }
  };


  // Both axes are wired, and each one leads to the bar's own: a bar scrolls where it can scroll,
  // whichever axis the input names.
  //
  // **For the wheel that is the whole point.** A plain mouse wheel reports a vertical delta and
  // nothing else, so a horizontal bar wired to its own axis alone would take no wheel at all - and
  // because the hook stops every wheel event it takes, the content around the bar would not scroll
  // either. The secondary wheel and the shift key keep working, both reaching the bar through the
  // other callback.
  //
  // **For touch it is not**, which is why the second callback filters by event type: a finger
  // dragged across a horizontal bar means to scroll the page behind it, not to move the tabs, and
  // a diagonal drag would otherwise move the bar by both of its distances at once.
  //
  // The whole set is claimed only while the tabs do not fit: the hook stops the propagation of
  // every wheel and touch event it takes, so a bar with nothing to scroll would swallow the
  // gesture and leave the content around it standing still.
  const scrollHandlersProps = useScrollHandlers<HTMLDivElement>({
    ...(isOverflow && {
      enableWheel: true,
      enableTouch: true,
      ...(isVertical
        ? { onChangeY: handleChangeScroll, onChangeX: handleChangeScrollAcross }
        : { onChangeX: handleChangeScroll, onChangeY: handleChangeScrollAcross }),
    }),
  });


  /**
   * Handler for the callback prop "onClick" of the two scroll buttons: scrolls by
   * one tab. Forwards, the first tab that is cut off at the end comes fully into view. Backwards,
   * the last tab that is cut off at the beginning does - unless less than half of it is hidden, in
   * which case the tab before it comes into view instead, because scrolling to the start of a tab
   * that is barely cut off would hardly move the bar.
   */
  const handleClickScrollButton: ScrollButtonProps['onClick'] = ({ dir }) => {
    const forwards = (dir === 'right') || (dir === 'down');
    const scrollOffset = getScrollOffset();

    if (forwards) {
      for (const itemId of itemIds) {
        const position = getItemPosition(itemId);

        if (position && ((position.offset + position.dim) > (scrollOffset + dimVisible))) {
          scrollTo(position.offset + position.dim - dimVisible);
          break;
        }
      }
    } else {
      const lastIdx = itemIds.length - 1;

      for (const [idx, itemId] of [...itemIds].reverse().entries()) {
        const position = getItemPosition(itemId);
        const isFirst = (idx === lastIdx);

        if (
          position
          && (position.offset < scrollOffset)
          && (isFirst || ((scrollOffset - position.offset) > (position.dim / 2)))
        ) {
          scrollTo(position.offset);
          break;
        }
      }
    }
  };


  /**
   * Handler for the React event "onKeyDown" of the tab list: the arrow keys move
   * the selection from tab to tab and the focus travels with it, Home and End go to its two ends.
   * The selection follows the focus, which the ARIA tabs pattern asks for wherever showing the new
   * content costs nothing - and a tab bar switches a content that is rendered either way. The keys
   * report the new tab through its own callback prop "onClick", the one a click on it would call:
   * the bar states the selection and never holds it.
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // The arrow keys follow what the user sees: the axis the bar runs along, and in a right-to-left
    // document the horizontal pair swaps, the first tab lying on the right.
    const keysHorizontal: [string, string] = isRtl
      ? ['ArrowRight', 'ArrowLeft']
      : ['ArrowLeft', 'ArrowRight'];
    const [keyBackward, keyForward] = isVertical ? ['ArrowUp', 'ArrowDown'] : keysHorizontal;
    const idx = enabledIds.findIndex((itemId) => (itemId === selectedId));
    let nextIdx;

    if (event.key === keyForward) {
      nextIdx = (idx < 0) ? 0 : ((idx + 1) % enabledIds.length);
    } else if (event.key === keyBackward) {
      nextIdx = (idx < 0) ? (enabledIds.length - 1) : ((idx - 1 + enabledIds.length) % enabledIds.length);
    } else if (event.key === 'Home') {
      nextIdx = 0;
    } else if (event.key === 'End') {
      nextIdx = enabledIds.length - 1;
    }

    const nextId = (nextIdx === undefined) ? undefined : enabledIds[nextIdx];

    if (nextId === undefined) {
      return;
    }

    // Whatever the key would otherwise do - an arrow key scrolls the content around the bar, Home
    // and End jump to its ends - is not what it means here.
    event.preventDefault();

    itemHandlesRef.current[nextId]?.focus();

    // The keyboard reports the tab as its click would.
    const nextItem = items.find((item) => (item.props.id === nextId));

    nextItem?.props.onClick?.({ id: nextId, event });
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // Places the marker on the selected tab and scrolls that tab into view, with the length of a
  // scroll button's shader of room before and after it: the button stands in the middle of that
  // shader, so the tab lies clear of both the button and the fade. It runs again whenever something
  // can have moved the tab: the selection, the tabs, the text direction, the bar's size or its
  // content's. The place comes from the tabs' measurements, so it is taken once the layout stands,
  // and it is a state set from the animation frame that follows rather than from the effect
  // itself - a measurement is an external fact the component subscribes to, not a value it derives
  // from its props.
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const position = ((dimVisible > 0) && (dimTotal > 0) && (selectedId !== null))
        ? getItemPosition(selectedId)
        : undefined;

      if (!position) {
        setMarkerPlace((prev) => (
          ((prev.offset === null) && (prev.dim === null)) ? prev : noMarkerPlace
        ));

        return;
      }

      const { offset, dim } = position;
      const scrollOffset = getScrollOffset();
      const scrollOffsetMin = Math.max(0, offset - scrollButtonShaderDim);
      const scrollOffsetMax = Math.min(dimTotal, offset + dim + scrollButtonShaderDim);

      if (scrollOffset > scrollOffsetMin) {
        scrollTo(scrollOffsetMin);
      } else if ((scrollOffset + dimVisible) < scrollOffsetMax) {
        scrollTo(scrollOffsetMax - dimVisible);
      }

      // The marker slides only when the selection moved from one tab to another. It does not slide
      // into its first place, nor when a tab merely changed its size or the bar its direction.
      const isNewSelection = (selectedId !== prevSelectedIdRef.current);
      prevSelectedIdRef.current = selectedId;

      setMarkerPlace((prev) => (
        ((offset === prev.offset) && (dim === prev.dim))
          ? prev
          : { offset, dim, animation: isNewSelection && (prev.offset !== null) }
      ));
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [selectedId, itemIdsKey, dimVisible, dimTotal, getItemPosition, getScrollOffset, scrollTo]);


  // The scroll buttons follow the bar's size and its content's - read from the frame that follows
  // the layout, for the same reason as above; the scrolling itself keeps them up to date through
  // its callback.
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(setVisibilityScrollButtons);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [setVisibilityScrollButtons]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const tabBarClasses = classNames(css.tabBar, {
    [css.isBackgroundMarker]: backgroundMarker,
    [css.isOverflow]: isOverflow,
    [css.isVertical]: isVertical,
  });

  return (
    <div
      ref={wrapperElemRef}
      {...(id && { id })}
      className={css.tabBarWrapper}
      style={{ ...outerElemStyle, ...outerCornerRadii }}
    >
      <div
        ref={tabBarElemRef}
        role="tablist"
        aria-orientation={isVertical ? 'vertical' : 'horizontal'}
        // The tab sequence stops at one of the tabs and never at the list (see "keyboardEntry"
        // below).
        // The list is focusable by script all the same, which is what a keyboard handler on an
        // interactive role asks for: the keys arrive here from the focused tab, by bubbling.
        tabIndex={-1}
        className={tabBarClasses}
        {...scrollHandlersProps}
        onKeyDown={handleKeyDown}
      >
        <Marker
          pos={pos}
          offset={markerPlace.offset}
          dim={markerPlace.dim}
          animation={markerPlace.animation}
          backgroundMarker={backgroundMarker}
          color={modMarkerColor}
          cornerRadii={outerCornerRadii}
        />
        {items.map((item) => {
          const { id: itemId } = item.props;
          const selected = (itemId === selectedId);
          const Item = item.type as React.ComponentType<TabBarItemProps>;

          // Every tab is rendered anew from its element, with the ref the bar measures and focuses
          // it through and the props only the bar can know: whether it is the selected one, whether
          // it is the tab the tab sequence stops at, the ground of the filled marker it stands on,
          // and which of the two markers the bar draws, which decides the tab's interaction
          // appearance. Rendered as JSX rather than cloned, because the ref is a ref only as a JSX
          // attribute - in an object handed to cloneElement it is a function that writes a ref
          // during render. The ref stands after the spread so that the bar's wins.
          return (
            <Item
              key={item.key}
              {...item.props}
              ref={(handle: TabBarItemHandle | null) => itemRefCallback(itemId, handle)}
              selected={selected}
              keyboardEntry={itemId === keyboardEntryId}
              {...(backgroundMarker && selected && markerGround && { markerGround })}
              backgroundMarker={backgroundMarker}
            />
          );
        })}
      </div>
      <ScrollButton
        dir={isVertical ? 'up' : 'left'}
        pos={scrollButtonPos}
        show={showScrollButtonStart}
        showShader
        {...(stylingProps.backgroundColor && { shaderColor: stylingProps.backgroundColor })}
        holdable
        onClick={handleClickScrollButton}
      />
      <ScrollButton
        dir={isVertical ? 'down' : 'right'}
        pos={scrollButtonPos}
        show={showScrollButtonEnd}
        showShader
        {...(stylingProps.backgroundColor && { shaderColor: stylingProps.backgroundColor })}
        holdable
        onClick={handleClickScrollButton}
      />
    </div>
  );
  //                                                                                  </editor-fold>
};

TabBar.displayName = 'TabBar';


export { TabBar };
