import {
  useEffect, useImperativeHandle, useRef, useState,
} from 'react';

import { layout, typo } from 'assets/styles';
import { IconForControls } from 'components/helpers/iconForControls';
import { NoticeForControls } from 'components/helpers/noticeForControls';
import { useFadeInOut } from 'components/hooks/useFadeInOut';
import { useScrollHandlers } from 'components/hooks/useScrollHandlers';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';
import { measureText } from 'utils/measureText';
import { isNonEmptyString, isNonEmptyStringOrNumber } from 'utils/type';

import { Menu } from './menu/Menu';
import * as css from './selectBox.scss';
import { type SelectBoxProps, SelectBoxStatus, selectBoxStylingProps } from './selectBox.types';
import { Text } from './text/Text';


/**
 * React component of the control component "SelectBox".
 */
const SelectBox = <ValueType extends string | number>({
  ref, id, status = SelectBoxStatus.IDLE, bare = false, flush,
  dense = false, limitMenu = Infinity, emptyHint = '', noSelection = false,
  selectByWheel = false, deleteButton = false, options, value = null, notice = '', onSelect,
  ...restProps
}: SelectBoxProps<ValueType>) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  // Whether the user has asked for the menu - a wish, not the answer. Whether the menu shows is
  // derived from this further down, where the control's status is known.
  const [isMenuRequested, setIsMenuRequested] = useState(false);

  // The whole control - pane and notice - against the pane alone: what the wheel and the touch have
  // to leave alone is the control, the notice below the pane included.
  const selectBoxContrRef = useRef<HTMLSpanElement>(null);
  const selectBoxRef = useRef<HTMLSpanElement>(null);
  const prevValueIndexRef = useRef<number>(undefined);
  const scrollDataRef = useRef({
    wheelPos: 0,
    prevWheelTimeMs: 0,
    touchPos: 0,
  });
  const searchStrRef = useRef('');
  const moveMenuTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchStrResetTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, selectBoxStylingProps);

  const safeOptions = options ?? [];

  let valueIndex = -1,
    option = null,
    noOptionHint = '';

  /**
   * Helper function to derive whether any option can be chosen, the width the widest option needs
   * and the style of the pane.
   */
  const deriveContentDims = () => {
    const res = {
      areEnabledOptions: safeOptions.some((o) => !o.isDisabled),
      contentWidth: 0,
      paneStyle: {
        gridTemplateColumns: '',
      },
    };
    let maxTextWidth = 0;

    // derive the maximum width of the texts of all options plus the empty hint and the no-selection
    // text (if it is a string)
    maxTextWidth = safeOptions.reduce((acc, o) => (
      Math.max(acc, measureText((o.text || String(o.value)), { fontWeight: typo.typoSet.value.small.fontWeight, fontSize: typo.typoSet.value.small.fontSize }))
    ), maxTextWidth);

    if (emptyHint !== '') {
      maxTextWidth = Math.max(maxTextWidth, measureText(emptyHint, { fontWeight: typo.typoSet.hint.fontWeight, fontSize: typo.typoSet.hint.fontSize }));
    }

    if (isNonEmptyString(noSelection)) {
      maxTextWidth = Math.max(maxTextWidth, measureText(noSelection, { fontWeight: typo.typoSet.hint.fontWeight, fontSize: typo.typoSet.hint.fontSize }));
    }

    // One pixel of headroom against the measurement itself: measureText() draws on a canvas, whose
    // metrics need not agree with the layout engine's to the last fraction. A text measured one
    // fraction short is a text the pane clips, and the ellipsis appears on an option that would
    // have fit. The pixel travels into the text's own track and into the width of the menu.
    maxTextWidth += 1;

    res.contentWidth = maxTextWidth + (
      (deleteButton ? 2 : 1) * (layout.controls.inputControlColumnGap + layout.controls.iconDimDefault)
    );

    if (!dense) {
      res.paneStyle.gridTemplateColumns = `minmax(auto, ${maxTextWidth}px)`;
    }

    return res;
  };


  const { areEnabledOptions, contentWidth, paneStyle } = deriveContentDims();


  // Derive the actual option object and its array index, selected by the given options array and
  // the given value. If the value was not found or its option is disabled and a selection has to be
  // made, take the first enabled option of the array.
  if (areEnabledOptions) {
    valueIndex = safeOptions.findIndex((o) => ((o.value === value) && !o.isDisabled));

    if ((valueIndex < 0) && (noSelection === false)) {
      valueIndex = safeOptions.findIndex((o) => !o.isDisabled);
    }

    if (valueIndex >= 0) {
      option = safeOptions[valueIndex]!;
    } else if (isNonEmptyString(noSelection)) {
      noOptionHint = noSelection;
    }
  } else {
    noOptionHint = emptyHint;
  }

  // A select box with nothing left to choose is locked, and that lock is a DISABLED it sets itself
  // rather than a status of its own: the component can see the condition, so the consumer does not
  // have to state it. Everything that reads the status reads it through this one value.
  const modStatus = ((status !== SelectBoxStatus.BUSY) && !areEnabledOptions)
    ? SelectBoxStatus.DISABLED
    : status;
  const isDisabled = (modStatus === SelectBoxStatus.DISABLED);
  // What the two locking statuses leave: an idle select box and one showing an error take a
  // selection, the error being a statement about the value rather than about whether it may be
  // chosen.
  const enableSelection = (modStatus === SelectBoxStatus.IDLE)
    || (modStatus === SelectBoxStatus.ERROR);

  // The menu shows where it was asked for and a selection can be made - a control that locks while
  // its menu stands open therefore closes it in the same render, not in an effect one render later,
  // which is what showed an open menu on a locked control for the length of a frame.
  //
  // The second line is what keeps that closing final: with the wish left standing, a control would
  // open its menu again by itself the moment it unlocks, and BUSY going back to IDLE is the common
  // case. Setting state straight from the render body is what React asks for here rather than an
  // effect - it discards this pass and renders again before anything reaches the screen.
  if (isMenuRequested && !enableSelection) {
    setIsMenuRequested(false);
  }

  const showMenu = isMenuRequested && enableSelection;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to select the nth previous or nth next option, that is
   * available. Callback prop "onSelect" is called at the end, if a valid previous or next value can
   * be determined.
   *
   * @param steps - Negative value for the nth previous one or a positive value for the nth next one
   *   option.
   * @param event - An event object, if called from an event handle to propagate to onSelect.
   */
  const selectPrevOrNextOption = (steps: number, event: KeyboardEvent | React.KeyboardEvent<HTMLSpanElement> | React.TouchEvent<HTMLSpanElement> | React.WheelEvent<HTMLSpanElement>) => {
    let nextValueIndex = null;

    if (valueIndex < 0) {
      if ((safeOptions.length >= 0) && (steps !== 0)) {
        nextValueIndex = (steps < 0) ? (safeOptions.length - 1) : 0;
      }
    } else if (steps < 0) {
      for (let i = valueIndex; i >= 0; i--) {
        if (!safeOptions[i]!.isDisabled) {
          nextValueIndex = i;

          if (i <= (valueIndex + steps)) {
            break;
          }
        }
      }
    } else if (steps > 0) {
      for (let i = valueIndex; i < safeOptions.length; i++) {
        if (!safeOptions[i]!.isDisabled) {
          nextValueIndex = i;

          if (i >= (valueIndex + steps)) {
            break;
          }
        }
      }
    }

    if (nextValueIndex !== null) {
      onSelect?.({ value: safeOptions[nextValueIndex]!.value, event });
    }
  };


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    clientLeft: selectBoxRef.current?.clientLeft,
    clientWidth: selectBoxRef.current?.clientWidth,
    clientTop: selectBoxRef.current?.clientTop,
    clientHeight: selectBoxRef.current?.clientHeight,
    getBoundingClientRect: () => selectBoxRef.current?.getBoundingClientRect(),
    focus: () => {
      requestAnimationFrame(() => {
        selectBoxRef.current?.focus();
      });
    },
    blur: () => {
      requestAnimationFrame(() => {
        selectBoxRef.current?.blur();
      });
    },
    showMenu: () => {
      setIsMenuRequested((prevValue) => {
        if (!prevValue) {
          prevValueIndexRef.current = valueIndex;
          return true;
        }
        return prevValue;
      });
    },
    hideMenu: () => {
      setIsMenuRequested(false);
    },
  }), [valueIndex]);


  const scrollHandlersProps = useScrollHandlers<HTMLSpanElement>({
    enableWheel: true,
    enableTouch: true,
    onChangeY: ({ diff, event }) => {
      let steps;

      if (event.type === 'wheel') {
        // prevent wheel movement on the select box itself if prop "selectByWheel" is not set.
        if (!selectByWheel && (event.target instanceof Node) && selectBoxContrRef.current?.contains(event.target)) {
          return;
        }

        const speedFactor = 3.0;
        const wheelTimeMs = Date.now();

        scrollDataRef.current.wheelPos += Math.abs(diff / (layout.controlMenus.optionHeight * speedFactor));

        if ((wheelTimeMs - scrollDataRef.current.prevWheelTimeMs) > 100) {
          steps = Math.ceil(scrollDataRef.current.wheelPos);
          scrollDataRef.current.wheelPos -= steps;
          scrollDataRef.current.prevWheelTimeMs = wheelTimeMs;
        }
      } else {
        // Prevent touch movement on the select box itself. Touch has to work only on the select box
        // menu.
        if ((event.target instanceof Node) && selectBoxContrRef.current?.contains(event.target)) {
          return;
        }

        scrollDataRef.current.touchPos += Math.abs(diff / layout.controlMenus.optionHeight);
        steps = Math.ceil(scrollDataRef.current.touchPos);
        scrollDataRef.current.touchPos -= steps;
      }

      if (steps) {
        selectPrevOrNextOption((diff >= 0) ? steps : -steps, event);
      }
    },
  });


  /**
   * Handler for the synthetic React event "onClick" of the main element of the select box to show
   * the select box menu.
   */
  const handleClick: React.MouseEventHandler<HTMLSpanElement> = (event) => {
    event.stopPropagation();

    setIsMenuRequested((prevValue) => {
      if (!prevValue) {
        prevValueIndexRef.current = valueIndex;
        return true;
      }
      return prevValue;
    });
  };


  /**
   * Handler for the synthetic React event "onKeyDown" of the main element of the select box to:
   * - select the next or previous option by an arrow key,
   * - close the select box menu by the return or tab key,
   * - toggle the select box menu by the space key,
   * - de-select the selected option and close the select box menu by the delete key,
   * - undo a selection and close the select box menu by the escape key,
   * - search for a selection by any character or numeric key.
   */
  const handleKeyDown: React.KeyboardEventHandler<HTMLSpanElement> = (event) => {
    switch (event.key) {
      // -------------------------------------------------------------------------------------------
      case 'ArrowUp':
      // -------------------------------------------------------------------------------------------

        event.stopPropagation();
        if (showMenu) {
          selectPrevOrNextOption(-1, event);
        }

        setIsMenuRequested((prevValue) => {
          if (!prevValue) {
            prevValueIndexRef.current = valueIndex;
            return true;
          }
          return prevValue;
        });
        break;

      // -------------------------------------------------------------------------------------------
      case 'ArrowDown':
      // -------------------------------------------------------------------------------------------

        event.stopPropagation();
        if (showMenu) {
          selectPrevOrNextOption(1, event);
        }

        setIsMenuRequested((prevValue) => {
          if (!prevValue) {
            prevValueIndexRef.current = valueIndex;
            return true;
          }
          return prevValue;
        });
        break;

      // -------------------------------------------------------------------------------------------
      case 'Enter':
      case 'Tab':
      // -------------------------------------------------------------------------------------------

        if (showMenu) {
          event.stopPropagation();
          setIsMenuRequested(false);
        }
        break;

      // -------------------------------------------------------------------------------------------
      case ' ':
      // -------------------------------------------------------------------------------------------

        event.stopPropagation();
        setIsMenuRequested((prevValue) => !prevValue);
        break;

      // -------------------------------------------------------------------------------------------
      case 'Delete':
      // -------------------------------------------------------------------------------------------

        if (option) {
          event.stopPropagation();
          onSelect?.({ value: null, event });
          setIsMenuRequested(false);
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'Escape':
      // -------------------------------------------------------------------------------------------

        if (showMenu) {
          event.stopPropagation();

          if (prevValueIndexRef.current !== valueIndex) {
            if (prevValueIndexRef.current && safeOptions[prevValueIndexRef.current]) {
              onSelect?.({ value: safeOptions[prevValueIndexRef.current]!.value, event });

              moveMenuTimeoutRef.current = setTimeout(() => {
                setIsMenuRequested(false);
              }, layout.animationTime.mediumMs);
            } else {
              onSelect?.({ value: null, event });
              setIsMenuRequested(false);
            }
          } else {
            setIsMenuRequested(false);
          }
        } else if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        break;

      // -------------------------------------------------------------------------------------------
      default: {
      // -------------------------------------------------------------------------------------------

        if (/^[0-9a-zäöüß_\-.,;:?!]$/i.test(event.key)) {
          const numOptions = safeOptions.length;

          searchStrRef.current = `${searchStrRef.current}${event.key.toLowerCase()}`;

          for (let i = 0; i < numOptions; i++) {
            // idx is [valueIndex + 1, ..., numOptions -1, 0, ... valueIndex]
            const idx = (i + valueIndex + 1) % numOptions;

            if (
              !safeOptions[idx]!.isDisabled
              && (safeOptions[idx]!.text || String(safeOptions[idx]!.value)).toLowerCase().includes(searchStrRef.current)
            ) {
              onSelect?.({ value: safeOptions[idx]!.value, event });
              break;
            }
          }

          clearTimeout(searchStrResetTimeoutRef.current);

          searchStrResetTimeoutRef.current = setTimeout(() => {
            searchStrRef.current = '';
          }, 1000);
        }
      }
    }
  };


  /**
   * Handler for the callback prop "onClick" of the control component "IconForControls" to clear the
   * selection.
   */
  const handleDeleteSelection: NonNullable<React.ComponentProps<typeof IconForControls>['onClick']> = (event) => {
    event.stopPropagation();
    onSelect?.({ value: null, event });
  };


  /**
   * Handler for the callback prop "onSelectOption" of the sub-component "Menu". Here, the callbck
   * prop "onSelect" will be called with the value of the selected option.
   */
  const handleSelectOption: React.ComponentProps<typeof Menu>['onSelectOption'] = ({ value: nextValue, event }) => {
    const nextOption = safeOptions.find((o) => ((o.value === nextValue) && !o.isDisabled));

    onSelect?.({ value: nextOption ? nextOption.value : null, event });

    moveMenuTimeoutRef.current = setTimeout(() => {
      setIsMenuRequested(false);
    }, layout.animationTime.mediumMs);
  };


  /**
   * Handler for the callback prop "onReselectCurrentOption" of the sub-component "Menu" to select
   * the current selected option again.
   */
  const handleReselectCurrentOption: React.ComponentProps<typeof Menu>['onReselectCurrentOption'] = (event) => {
    onSelect?.({ value: option?.value ?? null, event });
    setIsMenuRequested(false);
  };


  /**
   * Handler for the callback prop "onClose" of the sub-component "Menu" to close it.
   */
  const handleCloseMenu: React.ComponentProps<typeof Menu>['onClose'] = () => {
    setIsMenuRequested(false);
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // Effect that automatically calls prop "onSelect" if a given value does not result in an option
  // or if no value results in an option at the change of prop "value" or "option".
  useEffect(() => {
    if (!option && isNonEmptyStringOrNumber(value)) {
      onSelect?.({ value: null });
    } else if (option && (option.value !== value)) {
      onSelect?.({ value: option.value });
    }
  }, [value, option, onSelect]);


  useEffect(() => () => {
    clearTimeout(moveMenuTimeoutRef.current);
    clearTimeout(searchStrResetTimeoutRef.current);
  }, []);


  const { visibility } = useFadeInOut({ show: showMenu });


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  // The pane is the select box's whole face: it holds the selected option, it answers the pointer
  // and it states the status, all on this one element. A select box flush on both sides carries
  // both flush classes - there is no third class for it.
  const selectBoxClasses = classNames(css.selectBox, {
    [css.bare]: bare,
    [css.flushStart]: (flush === 'start') || (flush === 'both'),
    [css.flushEnd]: (flush === 'end') || (flush === 'both'),
    [css.disabled]: isDisabled,
    [css.busy]: (modStatus === SelectBoxStatus.BUSY),
    [css.error]: (modStatus === SelectBoxStatus.ERROR),
  });


  return (
    <span ref={selectBoxContrRef} className={css.selectBoxContr} style={outerElemStyle} {...scrollHandlersProps}>
      <span
        ref={selectBoxRef}
        {...(id && { id })}
        role="listbox"
        className={selectBoxClasses}
        style={paneStyle}
        {...(enableSelection && {
          tabIndex: 0,
          onClick: handleClick,
          onKeyDown: handleKeyDown,
        })}
      >
        <Text disable={isDisabled} noOptionHint={noOptionHint} option={option} />
        {deleteButton && option && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
          <IconForControls disable={!enableSelection} icon="DELETE" onClick={handleDeleteSelection} />
        )}
        <IconForControls disable={isDisabled} icon="NAVIDOWN" showSpinner={modStatus === SelectBoxStatus.BUSY} />
      </span>
      {!!notice && (
        <NoticeForControls disable={isDisabled} notice={notice} isErrorText={(modStatus === SelectBoxStatus.ERROR)} />
      )}
      {(visibility !== 'hide') && (
        <Menu<ValueType>
          selectBoxRef={selectBoxRef}
          show={(visibility === 'fadeIn') || (visibility === 'show')}
          contentWidth={contentWidth}
          limit={limitMenu}
          options={safeOptions}
          valueIndex={valueIndex}
          onSelectOption={handleSelectOption}
          onReselectCurrentOption={handleReselectCurrentOption}
          onClose={handleCloseMenu}
        />
      )}
    </span>
  );
  //                                                                                  </editor-fold>
};

SelectBox.displayName = 'SelectBox';


export { SelectBox };
