import { useImperativeHandle, useRef } from 'react';

import { useInteractions } from 'components/hooks/useInteractions';
import { type GroundStyle, useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';

import * as css from './tabBarContrItem.scss';
import { type TabBarContrItemProps, tabBarContrItemStylingProps } from './tabBarContrItem.types';


/**
 * React sub-component "TabBarContrItem" of the control component "TabBar": a tab that is a
 * container of its own, whose grid the call site lays out through the styling props, so that any
 * content can be arranged in it.
 */
const TabBarContrItem = ({
  ref, selected = false, keyboardEntry = false, markerGround, backgroundMarker = false, id,
  panelId = '', disable = false, children, onClick, ...restProps
}: TabBarContrItemProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const itemElemRef = useRef<HTMLDivElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // The container has no lettering of its own to lighten, so the ground it stands on reaches its
  // content through the call site alone; what the container itself does with it is choose which of
  // the two interaction veils it shows, where it shows one at all (below).
  const { elemStyle } = useStylingProps(restProps, tabBarContrItemStylingProps, {
    addCombinedStyle: true,
  });
  // The ground the tab stands on where it has one of its own: the filled marker's, or its own
  // colour's. It passes it on to its content, and its own veil follows it (see below).
  const itemStyle: GroundStyle = { ...elemStyle, ...(markerGround && { '--ground': markerGround }) };
  const ownGround = itemStyle['--ground'];


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  // The tab bar reads the position of its tabs through this handle: where the tab begins along the
  // bar's axis and how long it is. Both come from the element's border box - the offset counts to
  // that box's near edge, so the size has to be that box's too, or the two would disagree by the
  // width of a border - and both are measured against the scrolling list, the offset parent.
  useImperativeHandle(ref, () => ({
    getPosition: (isVertical) => {
      const elem = itemElemRef.current;

      if (!elem) {
        return undefined;
      }

      return isVertical
        ? { offset: elem.offsetTop, dim: elem.offsetHeight }
        : { offset: elem.offsetLeft, dim: elem.offsetWidth };
    },
    focus: () => {
      itemElemRef.current?.focus();
    },
  }), []);


  const { interactionProps } = useInteractions<HTMLDivElement>({
    enablePointer: true,
    enableKeyboard: true,
    enableFocus: true,
    disableAllEvents: disable,
    // A bar too short for its tabs scrolls by touch, and the list that scrolls is the tab's parent.
    // Without this the hook would stop every touch on the tab, and the tabs cover the bar - so the
    // gesture would reach the list over the bar's padding alone.
    enableTouchPropagation: true,
    // One tab of the bar is where the keyboard enters it and the others are reachable by the arrow
    // keys, which the bar handles (see TabBar.tsx). A disabled tab is reachable by neither: the
    // hook answers "disableAllEvents" with a tab index of -1 whatever stands here.
    tabIndex: keyboardEntry ? 0 : -1,
    onClick: (event) => {
      onClick?.({ id, event });
    },
  });


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const itemClasses = classNames(css.tabBarContrItem, {
    // The veil lies on the tab itself, so it follows the tab's own ground where it has one - its own
    // colour, or the filled marker it stands on - and the bar's where it has none. The bar's marker
    // decides whether the tab shows a veil at all or the opacity of the text appearance instead.
    // The selection rests at full opacity where the others thin.
    [css.groundDark]: (ownGround === 'dark'),
    [css.groundLight]: (ownGround === 'light'),
    [css.isBackgroundMarker]: backgroundMarker,
    [css.selected]: selected,
    [css.disabled]: disable,
  });

  return (
    <div
      ref={itemElemRef}
      id={id}
      role="tab"
      aria-selected={selected}
      {...(panelId && { 'aria-controls': panelId })}
      className={itemClasses}
      style={itemStyle}
      {...interactionProps}
    >
      {children}
    </div>
  );
  //                                                                                  </editor-fold>
};

TabBarContrItem.displayName = 'TabBarContrItem';


export { TabBarContrItem };
