import PropTypes from 'prop-types';
import {
  memo, forwardRef, useState, useRef, useMemo, useImperativeHandle, useCallback, useEffect,
} from 'react';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import { TICKBOX_MIXED } from 'components/controls/checkBox';
import IconForControls from 'components/helpers/iconForControls';
import NoticeForControls from 'components/helpers/noticeForControls';
import useFadeInOut from 'components/hooks/useFadeInOut';
import useStylingProps from 'components/hooks/useStylingProps';
import classNames from 'utils/classNames';

import Menu from './menu';
import Text from './text';
import multiSelectBoxDefines from './defines';
import { MultiSelectBoxState } from './enums';
import css from './multiSelectBox.scss';
import stylingProps from './stylingProps';


const noticeBottomPx = (
  ((defines.layout.controls.heightDefault - multiSelectBoxDefines.multiSelectBox.innerHeight) / -2)
  - defines.layout.controls.noticeHeight
);


/**
 * Memoized React component of a multiple select box control element.
 */
const MultiSelectBox = memo(forwardRef(({
  id, htmlId, state, darkTheme, noLine, withBackground, limitMenu, hideAllOrNoneCheckbox, emptyHint,
  selectionText, noSelectionHint, allSelectedHint, options, values, notice, onSelect, ...restProps
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [showMenu, setShowMenu] = useState(null);

  const multiSelectBoxRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, stylingProps);

  const {
    optionKeys, optionsWithValues, text, areEnabledOptions, isCompleteSelection,
    isCompleteSelectionOfEnabledOptions,
  } = useMemo(() => {
    const res = {
      optionKeys: Object.keys(options),
      areEnabledOptions: false,
      isCompleteSelectionOfEnabledOptions: undefined,
    };

    const numOptions = res.optionKeys.length;
    const allSelectedTexts = [];

    res.optionsWithValues = res.optionKeys.map((key) => {
      const value = !!values[key];
      const disabled = !!options[key]?.disabled;
      const num = options[key]?.num;
      let valueTextWithoutNum = options[key]?.text;

      if (
        ((typeof valueTextWithoutNum !== 'string') || (valueTextWithoutNum === ''))
        && (typeof valueTextWithoutNum !== 'number')
      ) {
        valueTextWithoutNum = key;
      }

      const valueText = (typeof num === 'number') ? `${valueTextWithoutNum} (${num})` : valueTextWithoutNum;

      if (value) {
        allSelectedTexts.push(valueTextWithoutNum);
      }

      if (!disabled) {
        res.areEnabledOptions = true;

        if (res.isCompleteSelectionOfEnabledOptions === undefined) {
          res.isCompleteSelectionOfEnabledOptions = value;
        } else if (
          (res.isCompleteSelectionOfEnabledOptions !== TICKBOX_MIXED)
          && (value !== res.isCompleteSelectionOfEnabledOptions)
        ) {
          res.isCompleteSelectionOfEnabledOptions = TICKBOX_MIXED;
        }
      }

      return {
        key, value, text: valueText, disabled,
      };
    });

    const numSelected = allSelectedTexts.length;

    if (!res.areEnabledOptions && (emptyHint !== MultiSelectBox.defaultProps.emptyHint)) {
      res.text = emptyHint.toString();
    } else if ((numSelected === 0) && (noSelectionHint !== MultiSelectBox.defaultProps.noSelectionHint)) {
      res.text = noSelectionHint.toString();
    } else if ((numSelected === numOptions) && (allSelectedHint !== MultiSelectBox.defaultProps.allSelectedHint)) {
      res.text = allSelectedHint.toString();
    } else if (selectionText !== MultiSelectBox.defaultProps.selectionText) {
      if (typeof selectionText === 'function') {
        res.text = selectionText(numSelected, numOptions);
      } else {
        res.text = selectionText.toString()
          .replace('%0', numSelected.toString())
          .replace('%1', numOptions.toString());
      }
    } else {
      res.text = allSelectedTexts.join(', ');
    }

    if (numSelected === 0) {
      res.isCompleteSelection = false;
    } else if (numSelected === numOptions) {
      res.isCompleteSelection = true;
    } else {
      res.isCompleteSelection = TICKBOX_MIXED;
    }

    return res;
  }, [selectionText, emptyHint, noSelectionHint, allSelectedHint, options, values]);

  const enableSelection = ((state === MultiSelectBoxState.IDLE) || (state === MultiSelectBoxState.ERROR)) && areEnabledOptions;
  const showNotice = ((typeof notice === 'string') && (notice !== '')) || (typeof notice === 'number');


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    focus: () => {
      requestAnimationFrame(() => {
        multiSelectBoxRef.current.focus();
      });
    },
    blur: () => {
      requestAnimationFrame(() => {
        multiSelectBoxRef.current.blur();
      });
    },
    showMenu: () => {
      setShowMenu('byKey');
    },
    hideMenu: () => {
      setShowMenu(null);
    },
  }), []);


  /**
   * Handler for synthetic React event "onClick" on the multiple select box element to show the
   * multiple select box menu.
   */
  const handleClick = (event) => {
    event.stopPropagation();
    setShowMenu('byClick');
  };


  /**
   * Handler for synthetic React event "onKeyDown" on the multiple select box element to show or
   * hide the menu.
   */
  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case ' ':
        if (!showMenu) {
          event.stopPropagation();
          setShowMenu('byKey');
        }
        break;

      case 'Tab':
        if (showMenu) {
          event.stopPropagation();
          setShowMenu(null);
        }
        break;

      case 'Enter':
        if (showMenu) {
          event.stopPropagation();
          setShowMenu(null);
          multiSelectBoxRef.current.focus();
        }
        break;

      case 'Escape':
        if (showMenu) {
          event.stopPropagation();
          setShowMenu(null);
          multiSelectBoxRef.current.focus();
        } else {
          document.activeElement?.blur();
        }
        break;

      // no default
    }
  };


  /**
   * Memoized handler for event "onCompleteSelection" on a multiple select box option to select all
   * or none of the enabled options by calling callback prop "onSelect".
   */
  const handleCompleteSelection = useCallback((event) => {
    const nextValue = (isCompleteSelectionOfEnabledOptions !== true);

    onSelect(
      optionKeys.reduce((acc, key) => (
        ((!!acc[key] === nextValue) || options[key]?.disabled)
          ? acc
          : {
            ...acc,
            [key]: nextValue,
          }
      ), values),
      id,
      event,
    );
  }, [id, options, values, onSelect, optionKeys, isCompleteSelectionOfEnabledOptions]);


  /**
   * Memoized handler for event "onToggleOption" on a multiple select box option. Here, the callback
   * prop "onSelect" is called with the new values.
   */
  const handleToggleOption = useCallback((key, event) => {
    onSelect(
      { ...values, [key]: !values[key] },
      id,
      event,
    );
  }, [id, values, onSelect]);


  /**
   * Memoized handler for event "onClose" of the multiple select box menu.
   */
  const handleCloseMenu = useCallback(() => {
    setShowMenu(null);
  }, []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // Effect to check the changes of some conditions during showing the multiple select box menu.
  useEffect(() => {
    setShowMenu((prevValue) => ((prevValue && !enableSelection) ? null : prevValue));
  }, [enableSelection]);


  const { visibilityState } = useFadeInOut(!!showMenu);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const multiSelectBoxClasses = classNames(css.multiSelectBox, {
    [css.disabled]: (state === MultiSelectBoxState.DISABLED),
    [css.inactive]: (state === MultiSelectBoxState.BUSY) || !areEnabledOptions,
    [css.error]: (state === MultiSelectBoxState.ERROR),
    [css.noLine]: noLine,
    [css.withBackground]: withBackground,
    [css.darkTheme]: darkTheme,
    [css.showNotice]: showNotice,
  });


  return (
    <span
      {...((process.env.NODE_ENV === 'development') && { id: htmlId })}
      ref={multiSelectBoxRef}
      role="listbox"
      className={multiSelectBoxClasses}
      style={outerElemStyle}
      data-id={id}
      {...(enableSelection && {
        tabIndex: 0,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
      })}
    >
      {Text({
        darkTheme,
        disabled: (state === MultiSelectBoxState.DISABLED),
        noSelection: ((noSelectionHint !== MultiSelectBox.defaultProps.noSelectionHint) && !isCompleteSelection) || !areEnabledOptions,
        text,
      })}
      <IconForControls
        darkTheme={darkTheme}
        disabled={state === MultiSelectBoxState.DISABLED || !areEnabledOptions}
        icon="NAVIDOWN"
        showSpinner={state === MultiSelectBoxState.BUSY}
      />
      {showNotice && (
        <NoticeForControls
          right={withBackground ? 3 : 0}
          bottom={noticeBottomPx}
          left={withBackground ? 3 : 0}
          darkTheme={darkTheme}
          disabled={state === MultiSelectBoxState.DISABLED}
          notice={notice}
          isErrorText={state === MultiSelectBoxState.ERROR}
        />
      )}
      {(visibilityState !== Enums.Visibility.HIDE) && (
        <Menu
          multiSelectBoxRef={multiSelectBoxRef}
          show={(visibilityState === Enums.Visibility.FADE_IN) || (visibilityState === Enums.Visibility.SHOW)}
          showByClick={showMenu === 'byClick'}
          limit={limitMenu}
          hideAllOrNoneCheckbox={hideAllOrNoneCheckbox}
          options={optionsWithValues}
          selectionText={text}
          isCompleteSelection={isCompleteSelection}
          onCompleteSelection={handleCompleteSelection}
          onToggleOption={handleToggleOption}
          onClose={handleCloseMenu}
        />
      )}
    </span>
  );
  //                                                                                  </editor-fold>
}));

MultiSelectBox.displayName = 'MultiSelectBox';

MultiSelectBox.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  htmlId: PropTypes.string,
  state: PropTypes.instanceOf(MultiSelectBoxState),
  darkTheme: PropTypes.bool,
  noLine: PropTypes.bool,
  withBackground: PropTypes.bool,
  limitMenu: PropTypes.number,
  hideAllOrNoneCheckbox: PropTypes.bool,
  emptyHint: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  selectionText: PropTypes.oneOfType([PropTypes.func, PropTypes.string, PropTypes.number]),
  noSelectionHint: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  allSelectedHint: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  options: PropTypes.object,
  values: PropTypes.object,
  notice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSelect: PropTypes.func,
};

MultiSelectBox.defaultProps = {
  id: '',
  htmlId: null,
  state: MultiSelectBoxState.IDLE,
  darkTheme: false,
  noLine: false,
  withBackground: false,
  limitMenu: Infinity,
  hideAllOrNoneCheckbox: false,
  emptyHint: '',
  selectionText: '',
  noSelectionHint: '',
  allSelectedHint: '',
  options: {},
  values: {},
  notice: '',
  onSelect() {},
};

export { MultiSelectBoxState };
export default MultiSelectBox;
