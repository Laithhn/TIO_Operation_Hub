import PropTypes from 'prop-types';
import {
  useRef, useMemo, useCallback, useEffect,
} from 'react';
import { createPortal } from 'react-dom';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import CheckBox, { CheckBoxState, TICKBOX_MIXED } from 'components/controls/checkBox';
import Text from 'components/indicators/text';
import Section from 'components/layouts/section';
import { hooks } from 'store';
import classNames from 'utils/classNames';
import getViewportDims from 'utils/getViewportDims';
import measureText from 'utils/measureText';

import multiSelectBoxDefines from '../defines';
import css from './menu.scss';


const domChangeTolerance = 3;

// the width of an option without the text: checkbox icon + checkbox icon space + gap between
// checkbox icon and text + scroll bar width
const maxOptionWidthOffset = 18 + 5 + 7 + 20;


/**
 * Helper function to return the current dimensions of the viewport and the position of the given
 * multiple select box element. All values are in pixels without decimal places. If no valid element
 * is given, null is returned. Note that "right" is the position of the right side of the element,
 * measured from the right side of the viewport. The same applies for "bottom".
 *
 * @param {object} [elemRef] - Optionally the React-reference of an element.
 * @returns {{ left: number, right: number, width: number, top: number, bottom: number }|null}
 */
const getMultiSelectBoxDims = (elemRef) => {
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
    width: elemRef.current.clientWidth,
    top: Math.round(dims.top),
    bottom: Math.round(viewportHeight - dims.top - elemRef.current.clientHeight),
  };
};


/**
 * Memoized React component of the menu of the select box.
 */
const Menu = ({
  multiSelectBoxRef, show, showByClick, limit, hideAllOrNoneCheckbox, options, selectionText,
  isCompleteSelection, onCompleteSelection, onToggleOption, onClose,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = hooks.useI18n();

  const menuRef = useRef();
  const allOrNoneCheckBoxRef = useRef();
  const allCheckBoxesRef = useRef([]);
  const initialMultiSelectBoxDimsRef = useRef(getMultiSelectBoxDims(multiSelectBoxRef));


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const multiSelectBoxWidth = initialMultiSelectBoxDimsRef.current?.width ?? 0;
  const multiSelectBoxTop = initialMultiSelectBoxDimsRef.current?.top ?? 0;
  const multiSelectBoxBottom = initialMultiSelectBoxDimsRef.current?.bottom ?? 0;

  // derive some memoized values from some props that rarely change
  const {
    menuHeight, openToTheTop, maxOptionWidth, idxOfFirstEnabledOption, idxOfLastEnabledOption,
    keyOfFirstEnabledOption, keyOfLastEnabledOption,
  } = useMemo(() => {
    const res = {};
    let numOptsToShow = Math.min(Math.max(1, limit), options.length);

    // half the difference between the height of an option and the inner height of the select box in
    // pixels
    const optHeightDiffHalf = (multiSelectBoxDefines.multiSelectBoxOption.height - multiSelectBoxDefines.multiSelectBox.innerHeight) / 2;
    // the maximum number of options that can be placed above the select box
    const maxOpts2Top = Math.max(0, Math.floor((multiSelectBoxTop - optHeightDiffHalf - multiSelectBoxDefines.multiSelectBoxMenu.paddingTop - multiSelectBoxDefines.multiSelectBoxMenu.spaceToDocument) / multiSelectBoxDefines.multiSelectBoxOption.height));
    // the maximum number of options that can be placed below the select box
    const maxOpts2Bottom = Math.max(0, Math.floor((multiSelectBoxBottom - optHeightDiffHalf - multiSelectBoxDefines.multiSelectBoxMenu.paddingBottom - multiSelectBoxDefines.multiSelectBoxMenu.spaceToDocument) / multiSelectBoxDefines.multiSelectBoxOption.height));

    res.openToTheTop = (numOptsToShow > maxOpts2Bottom) && (maxOpts2Top > maxOpts2Bottom);
    numOptsToShow = Math.min(numOptsToShow, res.openToTheTop ? maxOpts2Top : maxOpts2Bottom);

    // the height of the visible menu in pixels
    res.menuHeight = (!hideAllOrNoneCheckbox ? (
      multiSelectBoxDefines.multiSelectBox.innerHeight
      + multiSelectBoxDefines.multiSelectBoxMenu.gapBetweenHeaderAndOptions
    ) : 0)
      + multiSelectBoxDefines.multiSelectBoxMenu.paddingTop + multiSelectBoxDefines.multiSelectBoxMenu.paddingBottom
      + (numOptsToShow * multiSelectBoxDefines.multiSelectBoxOption.height);

    // derive the maximum width of the texts of all options plus the empty hint and the no-selection
    // text (if it is a string)
    res.maxOptionWidth = options.reduce((acc, o) => (
      Math.max(acc, measureText(o.text, { fontWeight: defines.typo.typoSet.value.small.fontWeight, fontSize: defines.typo.typoSet.value.small.fontSize }) + maxOptionWidthOffset)
    ), multiSelectBoxWidth);

    const idxFirst = options.findIndex(({ disabled }) => !disabled);
    res.idxOfFirstEnabledOption = (idxFirst >= 0) ? idxFirst : undefined;

    if (res.idxOfFirstEnabledOption !== undefined) {
      res.keyOfFirstEnabledOption = options[res.idxOfFirstEnabledOption].key;
    } else {
      res.keyOfFirstEnabledOption = undefined;
    }

    for (let i = (options.length - 1); i >= 0; i--) {
      if (!options[i].disabled) {
        res.idxOfLastEnabledOption = i;
        break;
      }
    }

    if (res.idxOfLastEnabledOption !== undefined) {
      res.keyOfLastEnabledOption = options[res.idxOfLastEnabledOption].key;
    } else {
      res.keyOfLastEnabledOption = undefined;
    }

    return res;
  }, [limit, hideAllOrNoneCheckbox, options, multiSelectBoxWidth, multiSelectBoxTop, multiSelectBoxBottom]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const createRefs = (element, key) => {
    allCheckBoxesRef.current[key] = element;
  };


  /**
   * Handler for synthetic React event "onKeyDown" on any element of the menu.
   */
  const handleKeyDown = useCallback((event) => {
    switch (event.key) {
      // -------------------------------------------------------------------------------------------
      case 'Tab':
      // -------------------------------------------------------------------------------------------

        event.stopPropagation();

        if (!event.shiftKey && (event.target.dataset?.id === keyOfLastEnabledOption)) {
          event.preventDefault();

          if (!hideAllOrNoneCheckbox) {
            allOrNoneCheckBoxRef.current.focus();
          } else {
            allCheckBoxesRef.current[idxOfFirstEnabledOption].focus();
          }
        } else if (event.shiftKey && hideAllOrNoneCheckbox && (event.target.dataset?.id === keyOfFirstEnabledOption)) {
          event.preventDefault();
          allCheckBoxesRef.current[idxOfLastEnabledOption].focus();
        } else if (event.shiftKey && (event.target.dataset?.id === '')) {
          event.preventDefault();

          if (idxOfLastEnabledOption !== undefined) {
            allCheckBoxesRef.current[idxOfLastEnabledOption].focus();
          } else {
            allOrNoneCheckBoxRef.current.focus();
          }
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'Home':
      // -------------------------------------------------------------------------------------------

        event.stopPropagation();
        if (!hideAllOrNoneCheckbox) {
          allOrNoneCheckBoxRef.current.focus();
        } else if (idxOfFirstEnabledOption !== undefined) {
          allCheckBoxesRef.current[idxOfFirstEnabledOption].focus();
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'End':
      // -------------------------------------------------------------------------------------------

        event.stopPropagation();

        if (idxOfLastEnabledOption !== undefined) {
          allCheckBoxesRef.current[idxOfLastEnabledOption].focus();
        } else if (!hideAllOrNoneCheckbox) {
          allOrNoneCheckBoxRef.current.focus();
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'ArrowUp':
      // -------------------------------------------------------------------------------------------

        event.stopPropagation();

        if ((event.target.dataset?.id === '') && (idxOfLastEnabledOption !== undefined)) {
          allCheckBoxesRef.current[idxOfLastEnabledOption].focus();
        } else {
          let found = false,
            idx;

          for (let i = (options.length - 1); i >= 0; i--) {
            if (options[i].key === event.target.dataset?.id) {
              found = true;
            } else if (found && !options[i].disabled) {
              idx = i;
              break;
            }
          }

          if (idx !== undefined) {
            allCheckBoxesRef.current[idx].focus();
          } else if (!hideAllOrNoneCheckbox) {
            allOrNoneCheckBoxRef.current.focus();
          } else if (idxOfLastEnabledOption !== undefined) {
            allCheckBoxesRef.current[idxOfLastEnabledOption].focus();
          }
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'ArrowDown':
      // -------------------------------------------------------------------------------------------

        event.stopPropagation();

        if ((event.target.dataset?.id === '') && (idxOfFirstEnabledOption !== undefined)) {
          allCheckBoxesRef.current[idxOfFirstEnabledOption].focus();
        } else {
          let found = false;
          const idx = options.findIndex(({ key, disabled }) => {
            if (key === event.target.dataset?.id) {
              found = true;
            } else if (found && !disabled) {
              return true;
            }
            return false;
          });

          if (idx >= 0) {
            allCheckBoxesRef.current[idx].focus();
          } else if (!hideAllOrNoneCheckbox) {
            allOrNoneCheckBoxRef.current.focus();
          } else if (idxOfFirstEnabledOption !== undefined) {
            allCheckBoxesRef.current[idxOfFirstEnabledOption].focus();
          }
        }
        break;

      // no default
    }
  }, [hideAllOrNoneCheckbox, options, idxOfFirstEnabledOption, idxOfLastEnabledOption, keyOfLastEnabledOption]);


  /**
   * Memoized handler for custom event "domChange" on the document to close the menu if the
   * dimensions of the multiple select box are changing.
   */
  const handleDomChange = useCallback(() => {
    const dims = getMultiSelectBoxDims(multiSelectBoxRef);

    if (initialMultiSelectBoxDimsRef.current && dims) {
      if (
        (isRtl && (Math.abs(dims.left - initialMultiSelectBoxDimsRef.current.left) > domChangeTolerance))
        || (!isRtl && (Math.abs(dims.right - initialMultiSelectBoxDimsRef.current.right) > domChangeTolerance))
        || (Math.abs(dims.top - initialMultiSelectBoxDimsRef.current.top) > domChangeTolerance)
        || (Math.abs(dims.bottom - initialMultiSelectBoxDimsRef.current.bottom) > domChangeTolerance)
      ) {
        onClose();
      }
    } else if (dims) {
      initialMultiSelectBoxDimsRef.current = dims;
    }
  }, [multiSelectBoxRef, onClose, isRtl]);


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


  useEffect(() => {
    if (!showByClick) {
      if (hideAllOrNoneCheckbox) {
        allCheckBoxesRef.current[0].focus();
      } else {
        allOrNoneCheckBoxRef.current.focus();
      }
    }
  }, [hideAllOrNoneCheckbox, showByClick]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!initialMultiSelectBoxDimsRef.current) {
    return null;
  }

  const menuClasses = classNames(css.menu, {
    [css.show]: show,
    [css.showAllOrNoneCheckbox]: !hideAllOrNoneCheckbox,
  });

  const menuStyle = {
    ...(isRtl ? {
      left: initialMultiSelectBoxDimsRef.current.left,
    } : {
      right: initialMultiSelectBoxDimsRef.current.right,
    }),
    width: `${maxOptionWidth + multiSelectBoxDefines.multiSelectBoxOption.paddingLeft + multiSelectBoxDefines.multiSelectBoxOption.paddingRight}px`,
    ...(openToTheTop ? {
      bottom: initialMultiSelectBoxDimsRef.current.bottom - multiSelectBoxDefines.multiSelectBoxMenu.paddingBottom,
    } : {
      top: initialMultiSelectBoxDimsRef.current.top - multiSelectBoxDefines.multiSelectBoxMenu.paddingTop,
    }),
    height: `${menuHeight}px`,
  };

  return createPortal(
    <div // eslint-disable-line jsx-a11y/no-static-element-interactions
      ref={menuRef}
      className={menuClasses}
      style={menuStyle}
      onKeyDown={handleKeyDown}
    >
      {!hideAllOrNoneCheckbox && (
        <Section
          gridTemplateColumns="auto 1fr"
          columnGap={Enums.GapAndPadding.SMALL}
          alignContent={Enums.PlaceContent.CENTER}
          alignItems={Enums.PlaceSelfItems.BASELINE}
          paddingRight={Enums.GapAndPadding.enumValues.find((padding) => (padding.value === multiSelectBoxDefines.multiSelectBoxOption.paddingRight))}
          paddingLeft={Enums.GapAndPadding.enumValues.find((padding) => (padding.value === multiSelectBoxDefines.multiSelectBoxOption.paddingLeft))}
        >
          <CheckBox
            ref={allOrNoneCheckBoxRef}
            value={isCompleteSelection}
            onClick={onCompleteSelection}
          />
          <Text type={Enums.TextType.LABEL} noOverflow>{selectionText ? `(${selectionText})` : ''}</Text>
        </Section>
      )}
      <Section
        gridAutoRows={`${multiSelectBoxDefines.multiSelectBoxOption.height}px`}
        justifyItems={Enums.PlaceSelfItems.START}
        paddingRight={Enums.GapAndPadding.enumValues.find((padding) => (padding.value === multiSelectBoxDefines.multiSelectBoxOption.paddingRight))}
        paddingLeft={Enums.GapAndPadding.enumValues.find((padding) => (padding.value === multiSelectBoxDefines.multiSelectBoxOption.paddingLeft))}
        scrollBarV
      >
        {options.map(({
          key, value, text, disabled,
        }, idx) => (
          <CheckBox
            ref={(element) => createRefs(element, idx)}
            key={key}
            id={key}
            state={disabled ? CheckBoxState.DISABLED : CheckBoxState.IDLE}
            text={text}
            value={value}
            onClick={onToggleOption}
          />
        ))}
      </Section>
    </div>,
    document.getElementById(process.env.ELEM_ID_TEMP),
  );
  //                                                                                  </editor-fold>
};

Menu.displaName = 'Menu';

Menu.propTypes = {
  multiSelectBoxRef: PropTypes.object.isRequired,
  show: PropTypes.bool,
  showByClick: PropTypes.bool,
  limit: PropTypes.number,
  hideAllOrNoneCheckbox: PropTypes.bool,
  options: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    value: PropTypes.bool,
    text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    disabled: PropTypes.bool,
  })),
  selectionText: PropTypes.string,
  isCompleteSelection: PropTypes.oneOf([false, true, TICKBOX_MIXED]),
  onCompleteSelection: PropTypes.func,
  onToggleOption: PropTypes.func,
  onClose: PropTypes.func,
};

Menu.defaultProps = {
  show: false,
  showByClick: false,
  limit: Infinity,
  hideAllOrNoneCheckbox: false,
  options: [],
  selectionText: '',
  isCompleteSelection: false,
  onCompleteSelection() {},
  onToggleOption() {},
  onClose() {},
};

export default Menu;
