import PropTypes from 'prop-types';
import {
  memo, forwardRef, useState, useRef, useMemo, useImperativeHandle, useCallback, useEffect,
} from 'react';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import IconForControls from 'components/helpers/iconForControls';
import NoticeForControls from 'components/helpers/noticeForControls';
import { useScrollHandlers } from 'components/helpers/scrolling';
import useFadeInOut from 'components/hooks/useFadeInOut';
import useStylingProps from 'components/hooks/useStylingProps';
import classNames from 'utils/classNames';
import measureText from 'utils/measureText';

import Menu from './menu';
import Text from './text';
import selectBoxDefines from './defines';
import { SelectBoxState } from './enums';
import css from './selectBox.scss';
import stylingProps from './stylingProps';


const noticeBottomPx = (
  ((defines.layout.controls.heightDefault - selectBoxDefines.selectBox.innerHeight) / -2)
  - defines.layout.controls.noticeHeight
);


/**
 * Memoized React component of a select box control element.
 */
const SelectBox = memo(forwardRef(({
  id, htmlId, state, darkTheme, noLine, withBackground, dense, limitMenu, emptyHint, noSelection,
  selectByWheel, deleteButton, options, value, notice, onSelect, ...restProps
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [showMenu, setShowMenu] = useState(false);

  const selectBoxRef = useRef();
  const prevValueIndexRef = useRef();
  const scrollDataRef = useRef({
    wheelPos: 0,
    prevWheelTimeMs: 0,
    touchPos: 0,
  });
  const moveMenuTimeoutRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let valueIndex = -1,
    option = null;

  const { outerElemStyle } = useStylingProps(restProps, stylingProps);

  // derive some memoized values from some props that rarely change
  const { areEnabledOptions, contentWidth, selectBoxStyle } = useMemo(() => {
    const res = {
      areEnabledOptions: options.some((o) => !o.disabled),
      contentWidth: 0,
      selectBoxStyle: {
        ...outerElemStyle,
      },
    };
    let maxTextWidth = 0;

    // derive the maximum width of the texts of all options plus the empty hint and the no-selection
    // text (if it is a string)
    maxTextWidth = options.reduce((acc, o) => (
      Math.max(acc, measureText((o.text || o.value), { fontWeight: defines.typo.typoSet.value.small.fontWeight, fontSize: defines.typo.typoSet.value.small.fontSize }))
    ), maxTextWidth);

    if (emptyHint !== '') {
      maxTextWidth = Math.max(maxTextWidth, measureText(emptyHint, { fontWeight: defines.typo.typoSet.hint.fontWeight, fontSize: defines.typo.typoSet.hint.fontSize }));
    }

    if ((typeof noSelection === 'string') && (noSelection !== '')) {
      maxTextWidth = Math.max(maxTextWidth, measureText(noSelection, { fontWeight: defines.typo.typoSet.hint.fontWeight, fontSize: defines.typo.typoSet.hint.fontSize }));
    }

    maxTextWidth += 1;

    res.contentWidth = maxTextWidth + (
      (deleteButton ? 2 : 1) * (selectBoxDefines.selectBox.gapBetweenTextAndIcon + selectBoxDefines.selectBoxIcon.dim)
    );

    if (!dense) {
      res.selectBoxStyle.gridTemplateColumns = `minmax(auto, ${maxTextWidth}px)`;
    }

    return res;
  }, [dense, emptyHint, noSelection, deleteButton, options, outerElemStyle]);


  // Derive the actual option object and its array index, selected by the given options array and
  // the given value. If the value was not found or its option is disabled and a selection has to be
  // made, take the first enabled option of the array.
  if (areEnabledOptions) {
    valueIndex = options.findIndex((o) => ((o.value === value) && !o.disabled));

    if ((valueIndex < 0) && (noSelection === false)) {
      valueIndex = options.findIndex((o) => !o.disabled);
    }

    if (valueIndex >= 0) {
      option = options[valueIndex];
    }
  }

  const enableSelection = ((state === SelectBoxState.IDLE) || (state === SelectBoxState.ERROR)) && areEnabledOptions;
  const showNotice = ((typeof notice === 'string') && (notice !== '')) || (typeof notice === 'number');


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to select the nth previous or nth next option, that is available. Callback prop
   * "onSelect" is called at the end, if a valid previous or next value can be determined.
   *
   * @param {number} steps - Negative value for the nth previous one or a positive value for the nth
   *   next one option.
   * @param {object} event - An event object, if called from an event handle to propagate to
   *   onSelect.
   */
  const selectPrevOrNextOption = useCallback((steps, event) => {
    let nextValueIndex = null;

    if (valueIndex < 0) {
      if ((options.length >= 0) && (steps !== 0)) {
        nextValueIndex = (steps < 0) ? (options.length - 1) : 0;
      }
    } else if (steps < 0) {
      for (let i = valueIndex; i >= 0; i--) {
        if (!options[i].disabled) {
          nextValueIndex = i;

          if (i <= (valueIndex + steps)) {
            break;
          }
        }
      }
    } else if (steps > 0) {
      for (let i = valueIndex; i < options.length; i++) {
        if (!options[i].disabled) {
          nextValueIndex = i;

          if (i >= (valueIndex + steps)) {
            break;
          }
        }
      }
    }

    if (nextValueIndex !== null) {
      onSelect(options[nextValueIndex].value, id, event);
    }
  }, [id, options, onSelect, valueIndex]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    focus: () => {
      requestAnimationFrame(() => {
        selectBoxRef.current.focus();
      });
    },
    blur: () => {
      requestAnimationFrame(() => {
        selectBoxRef.current.blur();
      });
    },
    showMenu: () => {
      setShowMenu((prevValue) => {
        if (!prevValue) {
          prevValueIndexRef.current = valueIndex;
          return true;
        }
        return prevValue;
      });
    },
    hideMenu: () => {
      setShowMenu(false);
    },
  }), [setShowMenu, valueIndex]);


  /**
   * Handler for synthetic React event "onClick" on the select box element to show the select
   * box menu.
   */
  const handleClick = (event) => {
    event.stopPropagation();

    setShowMenu((prevValue) => {
      if (!prevValue) {
        prevValueIndexRef.current = valueIndex;
        return true;
      }
      return prevValue;
    });
  };


  /**
   *
   */
  const scrollHandlersProps = useScrollHandlers({
    enableWheel: true,
    enableTouch: true,
    onChangeY: useCallback((delta, event) => {
      let steps;

      if (event.type === 'wheel') {
        // prevent wheel movement on the select box itself if prop "selectByWheel" is not set.
        if (!selectByWheel && selectBoxRef.current.contains(event.target)) {
          return;
        }

        const speedFactor = 3.0;
        const wheelTimeMs = Date.now();

        scrollDataRef.current.wheelPos += Math.abs(delta / (selectBoxDefines.selectBoxOption.height * speedFactor));

        if ((wheelTimeMs - scrollDataRef.current.prevWheelTimeMs) > 100) {
          steps = Math.ceil(scrollDataRef.current.wheelPos);
          scrollDataRef.current.wheelPos -= steps;
          scrollDataRef.current.prevWheelTimeMs = wheelTimeMs;
        }
      } else {
        // Prevent touch movement on the select box itself. Touch has to work only on the select box
        // menu.
        if (selectBoxRef.current.contains(event.target)) {
          return;
        }

        scrollDataRef.current.touchPos += Math.abs(delta / selectBoxDefines.selectBoxOption.height);
        steps = Math.ceil(scrollDataRef.current.touchPos);
        scrollDataRef.current.touchPos -= steps;
      }

      if (steps) {
        selectPrevOrNextOption((delta >= 0) ? steps : -steps, event);
      }
    }, [selectByWheel, selectPrevOrNextOption]),
  });


  /**
   * Memoized handler for event "onSelectOption" on a select box option. Here, the callbck prop
   * "onSelect" will be called with the value of the selected option.
   */
  const handleSelectOption = useCallback((nextValue, event) => {
    const nextOption = options.find((o) => ((o.value === nextValue) && !o.disabled));

    onSelect(nextOption ? nextOption.value : null, id, event);

    moveMenuTimeoutRef.current = setTimeout(() => {
      setShowMenu(false);
    }, selectBoxDefines.selectBoxMenu.moveMenuAnimationTimeMs);
  }, [id, options, onSelect]);


  /**
   * Memoized handler for event "onReselectCurrentOption" on a select box option to select the
   * current selected option again.
   */
  const handleReselectCurrentOption = useCallback((event) => {
    onSelect(option?.value ?? null, id, event);
    setShowMenu(false);
  }, [id, onSelect, option]);


  /**
   * Handler for synthetic React event "onKeyDown" on the select box element to select the next or
   * previous option by an arrow key, or to close the select box menu by the return, the space or by
   * the escape key.
   */
  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowUp':
        event.stopPropagation();
        if (showMenu) {
          selectPrevOrNextOption(-1, event);
        }

        setShowMenu((prevValue) => {
          if (!prevValue) {
            prevValueIndexRef.current = valueIndex;
            return true;
          }
          return prevValue;
        });
        break;

      case 'ArrowDown':
        event.stopPropagation();
        if (showMenu) {
          selectPrevOrNextOption(1, event);
        }

        setShowMenu((prevValue) => {
          if (!prevValue) {
            prevValueIndexRef.current = valueIndex;
            return true;
          }
          return prevValue;
        });
        break;

      case 'Enter':
      case 'Tab':
        if (showMenu) {
          event.stopPropagation();
          setShowMenu(false);
        }
        break;

      case ' ':
        event.stopPropagation();
        setShowMenu((prevValue) => !prevValue);
        break;

      case 'Delete':
        if (option) {
          event.stopPropagation();
          onSelect(null, id);
        }
        break;

      case 'Escape':
        if (showMenu) {
          event.stopPropagation();

          if (prevValueIndexRef.current !== valueIndex) {
            if (options[prevValueIndexRef.current]) {
              onSelect(options[prevValueIndexRef.current].value, id, event);

              moveMenuTimeoutRef.current = setTimeout(() => {
                setShowMenu(false);
              }, selectBoxDefines.selectBoxMenu.moveMenuAnimationTimeMs);
            } else {
              onSelect(null, id, event);
              setShowMenu(false);
            }
          } else {
            setShowMenu(false);
          }
        } else {
          document.activeElement?.blur();
        }
        break;

      // no default
    }
  };


  /**
   * Memoized handler for event "onClick" on the delete icon to clear the selection.
   */
  const handleDeleteSelection = useCallback((event) => {
    event.stopPropagation();
    onSelect(null, id);
  }, [id, onSelect]);


  /**
   * Memoized handler for event "onClose" on the menu to close it.
   */
  const handleCloseMenu = useCallback(() => {
    setShowMenu(false);
  }, []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // Effect that automatically calls prop "onSelect" if a given value does not result in an option
  // or if no value results in an option at the change of prop "value" or "option".
  useEffect(() => {
    if (
      !option
      && (((typeof value === 'string') && (value !== '')) || (typeof value === 'number'))
    ) {
      onSelect(null, id);
    } else if (option && (option.value !== value)) {
      onSelect(option.value, id);
    }
  }, [id, value, option, onSelect]);


  // Effect to check the changes of some conditions during showing the select box menu.
  useEffect(() => {
    setShowMenu((prevValue) => ((prevValue && !enableSelection) ? false : prevValue));
  }, [enableSelection]);


  useEffect(() => () => {
    clearTimeout(moveMenuTimeoutRef.current);
  }, []);


  const { visibilityState } = useFadeInOut(showMenu);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const selectBoxClasses = classNames(css.selectBox, {
    [css.disabled]: (state === SelectBoxState.DISABLED),
    [css.inactive]: (state === SelectBoxState.BUSY) || !areEnabledOptions,
    [css.error]: (state === SelectBoxState.ERROR),
    [css.noLine]: noLine,
    [css.withBackground]: withBackground,
    [css.darkTheme]: darkTheme,
    [css.showNotice]: showNotice,
  });


  return (
    <span
      {...((process.env.NODE_ENV === 'development') && { id: htmlId })}
      ref={selectBoxRef}
      role="listbox"
      className={selectBoxClasses}
      style={selectBoxStyle}
      data-id={id}
      {...(enableSelection && {
        tabIndex: 0,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        ...scrollHandlersProps,
      })}
    >
      {Text({
        darkTheme,
        disabled: (state === SelectBoxState.DISABLED),
        emptyHint,
        noSelection,
        areEnabledOptions,
        option,
      })}
      {deleteButton && option && (
        <IconForControls
          darkTheme={darkTheme}
          disabled={!enableSelection}
          icon="DELETE"
          onClick={handleDeleteSelection}
        />
      )}
      <IconForControls
        darkTheme={darkTheme}
        disabled={(state === SelectBoxState.DISABLED) || !areEnabledOptions}
        icon="NAVIDOWN"
        showSpinner={state === SelectBoxState.BUSY}
      />
      {showNotice && (
        <NoticeForControls
          right={withBackground ? 3 : 0}
          bottom={noticeBottomPx}
          left={withBackground ? 3 : 0}
          darkTheme={darkTheme}
          disabled={state === SelectBoxState.DISABLED}
          notice={notice}
          isErrorText={state === SelectBoxState.ERROR}
        />
      )}
      {(visibilityState !== Enums.Visibility.HIDE) && (
        <Menu
          selectBoxRef={selectBoxRef}
          show={(visibilityState === Enums.Visibility.FADE_IN) || (visibilityState === Enums.Visibility.SHOW)}
          contentWidth={contentWidth}
          dense={dense}
          limit={limitMenu}
          options={options}
          valueIndex={valueIndex}
          onSelectOption={handleSelectOption}
          onReselectCurrentOption={handleReselectCurrentOption}
          onClose={handleCloseMenu}
        />
      )}
    </span>
  );
  //                                                                                  </editor-fold>
}));

SelectBox.displayName = 'SelectBox';

SelectBox.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  htmlId: PropTypes.string,
  state: PropTypes.instanceOf(SelectBoxState),
  darkTheme: PropTypes.bool,
  noLine: PropTypes.bool,
  withBackground: PropTypes.bool,
  dense: PropTypes.bool,
  limitMenu: PropTypes.number,
  emptyHint: PropTypes.string,
  noSelection: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  selectByWheel: PropTypes.bool,
  deleteButton: PropTypes.bool,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    disabled: PropTypes.bool,
    italic: PropTypes.bool,
  })),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  notice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSelect: PropTypes.func,
};

SelectBox.defaultProps = {
  id: '',
  htmlId: null,
  state: SelectBoxState.IDLE,
  darkTheme: false,
  noLine: false,
  withBackground: false,
  dense: false,
  limitMenu: Infinity,
  emptyHint: '',
  noSelection: false,
  selectByWheel: false,
  deleteButton: false,
  options: [],
  value: undefined,
  notice: '',
  onSelect() {},
};

export { SelectBoxState };
export default SelectBox;
