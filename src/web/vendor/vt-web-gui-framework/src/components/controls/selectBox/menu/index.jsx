import PropTypes from 'prop-types';
import {
  useState, useRef, useMemo, useCallback, useEffect,
} from 'react';
import { createPortal } from 'react-dom';

import { ScrollBar, ScrollBarDir } from 'components/helpers/scrolling';
import { hooks } from 'store';
import classNames from 'utils/classNames';
import getViewportDims from 'utils/getViewportDims';

import selectBoxDefines from '../defines';
import css from './menu.scss';
import Marker from './marker';
import Options from './options';


const domChangeTolerance = 3;


/**
 * Helper function to return the position of the given select box element. All values are in pixels
 * without decimal places. If no valid element is given, null is returned. Note that "right" is the
 * position of the right side of the element, measured from the right side of the viewport. The same
 * applies for "bottom".
 *
 * @param {object} [elemRef] - Optionally the React-reference of an element.
 * @returns {{ left: number, right: number, width: number, top: number, bottom: number }|null}
 */
const getSelectBoxDims = (elemRef) => {
  const { width: viewportWidth, height: viewportHeight } = getViewportDims();
  const dims = elemRef?.current?.getBoundingClientRect();

  if (!dims) {
    return null;
  }

  let { marginRight, marginLeft } = window.getComputedStyle(elemRef.current);

  marginRight = ((typeof marginRight === 'string') && (marginRight.endsWith('px')))
    ? parseInt(marginRight.slice(0, -2), 10) : 0;

  marginLeft = ((typeof marginLeft === 'string') && (marginLeft.endsWith('px')))
    ? parseInt(marginLeft.slice(0, -2), 10) : 0;

  return {
    left: Math.round(dims.left + marginLeft),
    right: Math.round(viewportWidth - dims.right - marginRight),
    width: Math.round(dims.width),
    top: Math.round(dims.top),
    bottom: Math.round(viewportHeight - dims.bottom),
  };
};


/**
 * React component of the menu of the select box.
 */
const Menu = ({
  selectBoxRef, show, contentWidth, dense, limit, options, valueIndex, onSelectOption,
  onReselectCurrentOption, onClose,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = hooks.useI18n();

  const [scrollNumOfOptsByScrollBar, setScrollNumOfOptsByScrollBar] = useState(null);

  const menuRef = useRef();
  const initialSelectBoxDimsRef = useRef(getSelectBoxDims(selectBoxRef));


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const selectBoxTop = initialSelectBoxDimsRef.current?.top ?? 0;
  const selectBoxBottom = initialSelectBoxDimsRef.current?.bottom ?? 0;

  // derive some memoized values from some props that rarely change
  const {
    optHeightDiffHalf, maxOpts2Top, maxOpts2Bottom, numOptsInMenu, numOptsOutOfMenu, needScrollBar,
    menuHeight, optsHeight,
  } = useMemo(() => {
    const res = {};
    const numOpts = options.length;

    // half the difference between the height of an option and the inner height of the select box in
    // pixels
    res.optHeightDiffHalf = (selectBoxDefines.selectBoxOption.height - selectBoxDefines.selectBox.innerHeight) / 2;
    // the maximum number of options that can be placed above the select box
    res.maxOpts2Top = Math.max(0, Math.floor((selectBoxTop - res.optHeightDiffHalf - selectBoxDefines.selectBoxMenu.paddingTop - selectBoxDefines.selectBoxMenu.spaceToDocument) / selectBoxDefines.selectBoxOption.height));
    // the maximum number of options that can be placed below the select box
    res.maxOpts2Bottom = Math.max(0, Math.floor((selectBoxBottom - res.optHeightDiffHalf - selectBoxDefines.selectBoxMenu.paddingBottom - selectBoxDefines.selectBoxMenu.spaceToDocument) / selectBoxDefines.selectBoxOption.height));
    // The number of options that can be displayed in the menu. If this is less than the total
    // number of available options, a scroll bar is needed.
    res.numOptsInMenu = Math.min(Math.max(1, limit), numOpts, (res.maxOpts2Top + res.maxOpts2Bottom + 1));
    // the number of options that can not be displayed in the menu
    res.numOptsOutOfMenu = numOpts - res.numOptsInMenu;
    // a scroll bar has to be used in the menu or not
    res.needScrollBar = (res.numOptsInMenu < numOpts);
    // the height of the visible menu in pixels
    res.menuHeight = (res.numOptsInMenu * selectBoxDefines.selectBoxOption.height) + selectBoxDefines.selectBoxMenu.paddingTop + selectBoxDefines.selectBoxMenu.paddingBottom;
    // the total height of all options
    res.optsHeight = (numOpts * selectBoxDefines.selectBoxOption.height) + selectBoxDefines.selectBoxMenu.paddingTop + selectBoxDefines.selectBoxMenu.paddingBottom;

    return res;
  }, [limit, options, selectBoxTop, selectBoxBottom]);


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
    scrollOffset = scrollOffsetAsNumOpts * selectBoxDefines.selectBoxOption.height;
    markerTop = (markerTopAsNumOpts * selectBoxDefines.selectBoxOption.height) + selectBoxDefines.selectBoxMenu.paddingTop;
  } else {
    scrollOffset = 0;
    markerTop = (valueIndexPositive * selectBoxDefines.selectBoxOption.height) + selectBoxDefines.selectBoxMenu.paddingTop;
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
   * Memoized handler for event "onScroll" of the scroll bar. The given scrolling way is transformed
   * into the number of options, that are scrolled.
   */
  const handleScroll = useCallback((value) => {
    setScrollNumOfOptsByScrollBar(value / selectBoxDefines.selectBoxOption.height);
  }, []);


  /**
   * Memoized handler for custom event "domChange" on the document to close the menu if the
   * dimensions of the select box are changing.
   */
  const handleDomChange = useCallback(() => {
    const dims = getSelectBoxDims(selectBoxRef);

    if (initialSelectBoxDimsRef.current && dims) {
      if (
        (
          !dense && (
            (Math.abs(dims.left - initialSelectBoxDimsRef.current.left) > domChangeTolerance)
            || (Math.abs(dims.right - initialSelectBoxDimsRef.current.right) > domChangeTolerance)
          )
        )
        || (Math.abs(dims.top - initialSelectBoxDimsRef.current.top) > domChangeTolerance)
        || (Math.abs(dims.bottom - initialSelectBoxDimsRef.current.bottom) > domChangeTolerance)
      ) {
        onClose();
      }
    } else if (dims) {
      initialSelectBoxDimsRef.current = dims;
    }
  }, [selectBoxRef, onClose, dense]);


  /**
   * Memoized handler for native event "pointerdown" on the window element (but not on the menu or
   * its children itselves) to call prop onClose.
   */
  const handleWindowPointerDown = useCallback((event) => {
    if (!menuRef.current.contains(event.target)) {
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


  // Effect that resets the indicator that the scroll bar was moved, if the value index changed.
  useEffect(() => {
    setScrollNumOfOptsByScrollBar(null);
  }, [valueIndex]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!initialSelectBoxDimsRef.current) {
    return null;
  }

  const menuClasses = classNames(css.menu, {
    [css.show]: show,
  });

  const menuStyle = {
    ...(isRtl ? { left: initialSelectBoxDimsRef.current.left } : { right: initialSelectBoxDimsRef.current.right }),
    width: `${Math.max(initialSelectBoxDimsRef.current.width, contentWidth) + selectBoxDefines.selectBoxOption.paddingLeft + selectBoxDefines.selectBoxOption.paddingRight}px`,
    height: `${menuHeight}px`,
    transform: `translateY(${initialSelectBoxDimsRef.current.top - optHeightDiffHalf - selectBoxDefines.selectBoxMenu.paddingTop - (menuTopAsNumOpts * selectBoxDefines.selectBoxOption.height)}px)`,
  };

  return createPortal(
    <div
      ref={menuRef}
      className={menuClasses}
      style={menuStyle}
    >
      {Options({
        top: -scrollOffset,
        options,
        onSelectOption,
      })}
      {(valueIndex >= 0) && Marker({
        top: markerTop,
        onClick: onReselectCurrentOption,
      })}
      {needScrollBar && (
        <ScrollBar
          dir={ScrollBarDir.VERTICAL_END}
          dimVisible={menuHeight}
          dimTotal={optsHeight}
          scrollOffset={scrollOffset}
          scrollSteps={selectBoxDefines.selectBoxOption.height}
          onScroll={handleScroll}
        />
      )}
    </div>,
    document.getElementById(process.env.ELEM_ID_TEMP),
  );
  //                                                                                  </editor-fold>
};

Menu.displaName = 'Menu';

Menu.propTypes = {
  selectBoxRef: PropTypes.object.isRequired,
  show: PropTypes.bool,
  contentWidth: PropTypes.number,
  dense: PropTypes.bool,
  limit: PropTypes.number,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    disabled: PropTypes.bool,
    italic: PropTypes.bool,
  })),
  valueIndex: PropTypes.number,
  onSelectOption: PropTypes.func,
  onReselectCurrentOption: PropTypes.func,
  onClose: PropTypes.func,
};

Menu.defaultProps = {
  show: false,
  contentWidth: 0,
  dense: false,
  limit: Infinity,
  options: [],
  valueIndex: -1,
  onSelectOption() {},
  onReselectCurrentOption() {},
  onClose() {},
};

export default Menu;
