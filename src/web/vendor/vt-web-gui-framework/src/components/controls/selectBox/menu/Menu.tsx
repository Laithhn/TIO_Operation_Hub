import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';

import { layout } from 'assets/styles';
import { ScrollBar, type ScrollBarProps } from 'components/helpers/scrollBar';
import { useI18n } from 'components/hooks/useI18n';
import { classNames } from 'utils/classNames';
import { getViewportDims } from 'utils/getViewportDims';

import { Marker } from './marker/Marker';
import * as css from './menu.scss';
import type { MenuProps } from './menu.types';
import { Options } from './options/Options';


// The vertical offset that lands the text of the menu exactly on the text of the select box, which
// is what this menu is placed by wherever the space allows it. **It is zero, and that is a result
// rather than a coincidence:**
//
// - Both letterings are the same typographic set, so their baseline sits at the same place inside
//   their line box.
// - The value's line box is as tall as the pane (controls.heightDefault, 30px) and lies inside the
//   pane's 1px border, so it overflows its 28px inner height by one pixel per side: its middle sits
//   15px below the pane's top edge.
// - An option's line box is two pixels taller (heightDefault + 2, 32px) and lies in a box of
//   optionHeight (30px), overflowing by one pixel per side as well: its middle sits 15px below the
//   option's top edge too. The two extra pixels of line height are what answers the pane's two
//   pixels of border.
//
// So aligning the first option's top edge with the pane's top edge aligns the text, and nothing has
// to be added or subtracted. **Should either geometry change** - the pane's border, its height, or
// an option's line height - the offset returns, and it is the difference of those two middles.
//
// Until 2026-08-31 this was (optionHeight - inputControlInnerHeight) / 2, three pixels, carried
// over from v3 unchanged. There the value sat above a bottom line within an inner height of 24px,
// which is what that constant described; the pane replaced that construction, and the offset had
// been lifting the menu three pixels too high ever since. The constant left the controls map on
// 2026-09-02 with the last control that read it.
const textOffset = 0;

// The edge the menu draws around itself, which the glass gives it. It counts twice in a width
// measured from a text, and once between the menu's top edge and its first option.
const edgeWidth = 1;

const portalCntr = document.getElementById(process.env['ELEM_ID_TEMP'] ?? '');


/**
 * Helper function to return the position of the given select box element. Note that "right" is the
 * position of the right side of the element, measured from the right side of the viewport. The same
 * applies for "bottom".
 *
 * **No value is rounded, and that is what lands the menu's text on the control's.** Every one of
 * them places an edge of the menu against an edge of the control, and the control's edges lie on
 * fractions of a pixel: a grid divides its free space among its columns, and a row's height follows
 * whatever lettering stands in it. Rounding a measurement moved the menu off the control by that
 * fraction, and the offset shows as the two texts missing each other by about a pixel - twice over
 * horizontally, where the left edge is the difference of a rounded right edge and a rounded width.
 *
 * The option counts these values feed are floored, so they never needed the rounding either. What
 * it does cost is a menu whose own raster now sits on fractions as well, the marker included; that
 * is a soft edge on a flat fill against a text that misses its mark, which is no trade at all.
 *
 * **The pane's own margins are not corrected for, and must not be.** What the menu needs is the
 * pane's drawn edge, which is what getBoundingClientRect() returns - a margin has already moved
 * that edge, so the value is right as it stands and the same padding chain lands the two texts on
 * one line. Until 2026-09-02 the function added the horizontal margins on top, a leftover from v3,
 * where the pane was a bottom line that faked its padding with 3 px against a margin of -3 px and
 * the menu hung out to the side to compensate. That construction is gone; the correction stayed and
 * showed itself on the one control whose margin is not zero: a bare select box flush on both sides
 * carries -12 px per side, and its menu stood a full option padding beside the control.
 */
const getSelectBoxDims = (ref: React.RefObject<HTMLSpanElement | null>) => {
  const selectBoxRect = ref.current?.getBoundingClientRect();

  if (!selectBoxRect) {
    return undefined;
  }

  const { width: viewportWidth, height: viewportHeight } = getViewportDims();

  return {
    left: selectBoxRect.left,
    right: viewportWidth - selectBoxRect.right,
    width: selectBoxRect.width,
    top: selectBoxRect.top,
    bottom: viewportHeight - selectBoxRect.bottom,
  };
};


/**
 * React sub-component of the menu of the control component "SelectBox".
 */
const Menu = <ValueType,>({
  selectBoxRef, show, contentWidth, limit, options, valueIndex, onSelectOption,
  onReselectCurrentOption, onClose,
}: MenuProps<ValueType>) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = useI18n();

  // The pane is mounted whenever the menu is - "visibility" leaves "hide" only through a click, a key
  // or the imperative handle, and all three presuppose it - so the first measurement always finds a
  // pane, which is what the assertion stands on.
  const [selectBoxDims, setSelectBoxDims] = useState(getSelectBoxDims(selectBoxRef)!);
  const [scrollNumOfOptsByScrollBar, setScrollNumOfOptsByScrollBar] = useState<number | null>(null);
  // The value index this menu last saw, held only to notice that it has changed - the scroll way
  // the user dragged belongs to the selection it was dragged for, and a new selection retires it.
  const [prevValueIndex, setPrevValueIndex] = useState(valueIndex);

  const menuRef = useRef<HTMLDivElement>(null);
  const prevsRef = useRef<NonNullable<ReturnType<typeof getSelectBoxDims>>>({
    ...selectBoxDims,
  });


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // A new selection retires the scroll way the user dragged for the old one. Setting state straight
  // from the render body is what React asks for to answer a changed prop - it discards this pass and
  // renders again before anything reaches the screen, where the effect this replaced let the stale
  // scroll way through for the length of a frame.
  if (valueIndex !== prevValueIndex) {
    setPrevValueIndex(valueIndex);
    setScrollNumOfOptsByScrollBar(null);
  }

  /**
   * Helper function to derive how many options fit above and below the select box and into the
   * menu, whether the menu needs a scroll bar, and the heights of the menu and of its options.
   */
  const deriveMenuDims = () => {
    const res = {
      maxOpts2Top: 0,
      maxOpts2Bottom: 0,
      numOptsInMenu: 0,
      numOptsOutOfMenu: 0,
      needScrollBar: false,
      menuHeight: 0,
      optsHeight: 0,
    };
    const numOpts = options.length;

    // the maximum number of options that can be placed above the select box
    res.maxOpts2Top = Math.max(0, Math.floor(
      (selectBoxDims.top - textOffset - edgeWidth - layout.controlMenus.paddingTop - layout.controlMenus.spaceToDocument)
      / layout.controlMenus.optionHeight,
    ));

    // the maximum number of options that can be placed below the select box
    res.maxOpts2Bottom = Math.max(0, Math.floor(
      (selectBoxDims.bottom - textOffset - edgeWidth - layout.controlMenus.paddingBottom - layout.controlMenus.spaceToDocument)
      / layout.controlMenus.optionHeight,
    ));

    // The number of options that can be displayed in the menu. If this is less than the total
    // number of available options, a scroll bar is needed.
    res.numOptsInMenu = Math.min(Math.max(1, limit), numOpts, (res.maxOpts2Top + res.maxOpts2Bottom + 1));

    // the number of options that can not be displayed in the menu
    res.numOptsOutOfMenu = numOpts - res.numOptsInMenu;

    // a scroll bar has to be used in the menu or not
    res.needScrollBar = (res.numOptsInMenu < numOpts);

    // The height of the visible menu in pixels. The two edges are part of it because box-sizing is
    // border-box everywhere: a height set without them would take their two pixels off the room the
    // options have and cut the last one.
    res.menuHeight = (res.numOptsInMenu * layout.controlMenus.optionHeight)
      + layout.controlMenus.paddingTop + layout.controlMenus.paddingBottom + (2 * edgeWidth);

    // the total height of all options, measured the same way - the scroll bar compares the two
    res.optsHeight = (numOpts * layout.controlMenus.optionHeight)
      + layout.controlMenus.paddingTop + layout.controlMenus.paddingBottom + (2 * edgeWidth);

    return res;
  };


  const {
    maxOpts2Top, maxOpts2Bottom, numOptsInMenu, numOptsOutOfMenu, needScrollBar,
    menuHeight, optsHeight,
  } = deriveMenuDims();


  let menuTopAsNumOpts, scrollOffset, markerTop;

  // the zero based index of the selected option given by the props can be smaller than 0 when there
  // is no selection
  const valueIndexPositive = Math.max(0, valueIndex);

  // Set the top position of the menu as number of options above the select box. For example, a
  // value index of 2 means that the menu shows two options above the select box.
  menuTopAsNumOpts = needScrollBar ? (Math.ceil(numOptsInMenu / 2) - 1) : valueIndexPositive;

  // Limit the top position by the maximum number of options above or below the select box. It is
  // ensured that the size of the menu can not exceed both the maximum number of options above and
  // below (see calculation of numOptsInMenu above).
  if (menuTopAsNumOpts > maxOpts2Top) {
    menuTopAsNumOpts = maxOpts2Top;
  } else if (menuTopAsNumOpts < (numOptsInMenu - maxOpts2Bottom - 1)) {
    menuTopAsNumOpts = numOptsInMenu - maxOpts2Bottom - 1;
  }

  // calculate the initial number of steps of the scroll bar and the initial top position of the
  // marker if a scroll bar is needed
  if (needScrollBar) {
    let scrollOffsetAsNumOpts, markerTopAsNumOpts;

    if (scrollNumOfOptsByScrollBar !== null) {
      // if the scroll bar was moved, follow its scroll way
      scrollOffsetAsNumOpts = scrollNumOfOptsByScrollBar;
      markerTopAsNumOpts = valueIndexPositive - scrollNumOfOptsByScrollBar;
    } else if (valueIndexPositive < menuTopAsNumOpts) {
      // one of the upper options is selected: the scroll bar is at the top, the marker moves above
      // the select box
      scrollOffsetAsNumOpts = 0;
      markerTopAsNumOpts = valueIndexPositive;
    } else if (valueIndexPositive <= (menuTopAsNumOpts + numOptsOutOfMenu)) {
      // one of the center options is selected: the marker remains on top of the select box, the
      // scroll bar ajusts the options container to show the selected object on top of the select
      // box too
      scrollOffsetAsNumOpts = valueIndexPositive - menuTopAsNumOpts;
      markerTopAsNumOpts = menuTopAsNumOpts;
    } else {
      // one of the lower options is selected: the scroll bar is at the bottom, the marker moves
      // below the select box
      scrollOffsetAsNumOpts = numOptsOutOfMenu;
      markerTopAsNumOpts = valueIndexPositive - scrollOffsetAsNumOpts;
    }

    // calculate the actual top value of the scroll bar considering max and min values and the
    // scroll value from this.handleScroll()
    scrollOffsetAsNumOpts = Math.max(0, Math.min(numOptsOutOfMenu, scrollOffsetAsNumOpts));

    // calculate the real top positions in pixels of the options container, of the marker and of the
    // scroll bar in dependence on the calculated top position of the scroll bar as number of
    // options
    scrollOffset = scrollOffsetAsNumOpts * layout.controlMenus.optionHeight;
    markerTop = (markerTopAsNumOpts * layout.controlMenus.optionHeight) + layout.controlMenus.paddingTop;
  } else {
    scrollOffset = 0;
    markerTop = (valueIndexPositive * layout.controlMenus.optionHeight) + layout.controlMenus.paddingTop;
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for event "onScroll" of the scroll bar. The given scrolling way is transformed
   * into the number of options, that are scrolled.
   */
  const handleScroll: NonNullable<ScrollBarProps['onScroll']> = ({ scrollPos }) => {
    setScrollNumOfOptsByScrollBar(scrollPos / layout.controlMenus.optionHeight);
  };


  /**
   * Handler for the custom event "domChange" of the document to close the menu if
   * the dimensions of the select box are changing.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const handleDomChange = useCallback(() => {
    const dims = getSelectBoxDims(selectBoxRef);

    // No pane, nothing to place the menu against: React detaches the ref in the commit that removes
    // the pane and drops this listener with the effect's cleanup after it, so a DOM change observed
    // in between - a content switching while the menu is open - arrives here while the unmount is
    // under way.
    if (!dims) {
      return;
    }

    if (
      (dims.left !== prevsRef.current.left)
      || (dims.right !== prevsRef.current.right)
      || (dims.top !== prevsRef.current.top)
      || (dims.bottom !== prevsRef.current.bottom)
    ) {
      // A control that has left the viewport takes its menu with it. Each test carries half a pixel
      // of slack, which is what the rounding gave them before: a control lying flush against an
      // edge of the viewport lands a fraction on the wrong side of zero by subpixel layout alone,
      // and closing the menu over that would be closing it over nothing.
      if ((dims.left < -0.5) || (dims.right < -0.5) || (dims.top < -0.5) || (dims.bottom < -0.5)) {
        onClose();
      } else {
        setSelectBoxDims(dims);
      }
    }

    prevsRef.current = { ...dims };
  }, [selectBoxRef, onClose]);


  /**
   * Handler for the native event "pointerdown" of the window element (but not on
   * the menu or its children itselves) to call prop onClose.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const handleWindowPointerDown = useCallback((event: PointerEvent) => {
    if ((event.target instanceof Node) && !menuRef.current?.contains(event.target)) {
      onClose();
    }
  }, [onClose]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    document.addEventListener('domChange', handleDomChange);
    window.addEventListener('pointerdown', handleWindowPointerDown);

    return () => {
      document.removeEventListener('domChange', handleDomChange);
      window.removeEventListener('pointerdown', handleWindowPointerDown);
    };
  }, [handleDomChange, handleWindowPointerDown]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!portalCntr) {
    return null;
  }


  const menuClasses = classNames(css.menu, {
    [css.show]: show,
  });

  const menuStyle = {
    ...(isRtl ? { left: selectBoxDims.left } : { right: selectBoxDims.right }),
    // The menu covers the control: same right edge, and at least its width - which is what lands an
    // option's text on the control's text, both being padded by the same amount inside an edge of the
    // same width. Where the widest option needs more room than the control has, the menu grows to the
    // left of it, as it did in v3, and the texts part by that difference. "contentWidth" is measured
    // as the room the pane's content needs, so the menu's own padding and edges are added to it here.
    width: `${Math.max(selectBoxDims.width, contentWidth + layout.controlMenus.optionPaddingLeft + layout.controlMenus.optionPaddingRight + (2 * edgeWidth))}px`,
    height: `${menuHeight}px`,
    transform: `translateY(${selectBoxDims.top - textOffset - edgeWidth - layout.controlMenus.paddingTop - (menuTopAsNumOpts * layout.controlMenus.optionHeight)}px)`,
  };

  return createPortal(
    <div
      ref={menuRef}
      className={menuClasses}
      style={menuStyle}
    >
      <Options<ValueType> top={-scrollOffset} options={options} onSelectOption={onSelectOption} />
      {(valueIndex >= 0) && <Marker top={markerTop} onClick={onReselectCurrentOption} />}
      {needScrollBar && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <ScrollBar
          dir="verticalEnd"
          dimVisible={menuHeight}
          dimTotal={optsHeight}
          scrollOffset={scrollOffset}
          scrollSteps={layout.controlMenus.optionHeight}
          onScroll={handleScroll}
        />
      )}
    </div>,
    portalCntr,
  );
  //                                                                                  </editor-fold>
};

Menu.displayName = 'Menu';


export { Menu };
