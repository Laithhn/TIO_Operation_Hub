import { useImperativeHandle, useRef, useState } from 'react';

import type { CheckBoxValue } from 'components/controls/checkBox';
import { IconForControls } from 'components/helpers/iconForControls';
import { NoticeForControls } from 'components/helpers/noticeForControls';
import { useFadeInOut } from 'components/hooks/useFadeInOut';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';
import { isNumber } from 'utils/type';

import { Menu } from './menu/Menu';
import * as css from './multiSelectBox.scss';
import { type MultiSelectBoxProps, MultiSelectBoxStatus, multiSelectBoxStylingProps } from './multiSelectBox.types';
import { Text } from './text/Text';


/**
 * React component of the control component "MultiSelectBox".
 */
const MultiSelectBox = ({
  ref, id, status = MultiSelectBoxStatus.IDLE, bare = false, flush,
  limitMenu = Infinity, hideAllOrNoneCheckbox = false, searchBox = false, emptyHint = '',
  selectionText = '', noSelectionHint = '', allSelectedHint = '', options, values, notice = '',
  onSelect, ...restProps
}: MultiSelectBoxProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  // How the user has asked for the menu - by a key or by a click - or null for not at all. It is a
  // wish, not the answer: whether the menu shows is derived from it further down, where the
  // control's status is known.
  const [menuRequest, setMenuRequest] = useState<'byKey' | 'byClick' | null>(null);

  const multiSelectBoxRef = useRef<HTMLSpanElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, multiSelectBoxStylingProps);

  /**
   * Helper function to derive the options with their values, the text the box shows and how
   * complete the selection is, of all options and of the enabled ones.
   */
  const deriveSelection = () => {
    const res = {
      optionsWithValues: [] as React.ComponentProps<typeof Menu>['options'],
      text: '',
      areEnabledOptions: false,
      isCompleteSelection: false as CheckBoxValue,
      isCompleteSelectionOfEnabledOptions: undefined as CheckBoxValue | undefined,
    };

    const numOptions = (options ?? []).length;
    const allSelectedTexts: string[] = [];

    res.optionsWithValues = (options ?? []).map((option) => {
      const value = !!values?.[option.id];
      const isDisabled = !!option.isDisabled;
      const valueTextWithoutNum = option.text || option.id;
      const valueText = isNumber(option.num, { withoutInfinite: true })
        ? `${valueTextWithoutNum} (${option.num})`
        : valueTextWithoutNum;

      if (value) {
        allSelectedTexts.push(valueTextWithoutNum);
      }

      if (!isDisabled) {
        res.areEnabledOptions = true;

        if (res.isCompleteSelectionOfEnabledOptions === undefined) {
          res.isCompleteSelectionOfEnabledOptions = value;
        } else if (
          (res.isCompleteSelectionOfEnabledOptions !== 'tickBoxMixed')
          && (value !== res.isCompleteSelectionOfEnabledOptions)
        ) {
          res.isCompleteSelectionOfEnabledOptions = 'tickBoxMixed';
        }
      }

      return {
        id: option.id, value, text: valueText, isDisabled,
      };
    });

    const numSelected = allSelectedTexts.length;

    if (!res.areEnabledOptions && emptyHint) {
      res.text = emptyHint;
    } else if ((numSelected === 0) && noSelectionHint) {
      res.text = noSelectionHint;
    } else if ((numSelected === numOptions) && allSelectedHint) {
      res.text = allSelectedHint;
    } else if (selectionText) {
      if (typeof selectionText === 'function') {
        res.text = selectionText({ numSelected, numOptions });
      } else {
        res.text = selectionText
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
      res.isCompleteSelection = 'tickBoxMixed';
    }

    return res;
  };


  const {
    optionsWithValues, text, areEnabledOptions, isCompleteSelection,
    isCompleteSelectionOfEnabledOptions,
  } = deriveSelection();


  // A multiple select box with nothing left to choose is locked, and that lock is a DISABLED it sets
  // itself rather than a status of its own: the component can see the condition, so the consumer
  // does not have to state it. Everything that reads the status reads it through this one value.
  const modStatus = ((status !== MultiSelectBoxStatus.BUSY) && !areEnabledOptions)
    ? MultiSelectBoxStatus.DISABLED
    : status;
  const isDisabled = (modStatus === MultiSelectBoxStatus.DISABLED);
  // What the two locking statuses leave: an idle multiple select box and one showing an error take
  // a selection, the error being a statement about the value rather than about whether it may be
  // chosen.
  const enableSelection = (modStatus === MultiSelectBoxStatus.IDLE)
    || (modStatus === MultiSelectBoxStatus.ERROR);

  // The menu shows where it was asked for and a selection can be made - a control that locks while
  // its menu stands open therefore closes it in the same render, not in an effect one render later,
  // which is what showed an open menu on a locked control for the length of a frame.
  //
  // The second line is what keeps that closing final: with the wish left standing, a control would
  // open its menu again by itself the moment it unlocks, and BUSY going back to IDLE is the common
  // case. Setting state straight from the render body is what React asks for here rather than an
  // effect - it discards this pass and renders again before anything reaches the screen.
  if (menuRequest && !enableSelection) {
    setMenuRequest(null);
  }

  const showMenu = enableSelection ? menuRequest : null;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    clientLeft: multiSelectBoxRef.current?.clientLeft,
    clientWidth: multiSelectBoxRef.current?.clientWidth,
    clientTop: multiSelectBoxRef.current?.clientTop,
    clientHeight: multiSelectBoxRef.current?.clientHeight,
    getBoundingClientRect: () => multiSelectBoxRef.current?.getBoundingClientRect(),
    focus: () => {
      requestAnimationFrame(() => {
        multiSelectBoxRef.current?.focus();
      });
    },
    blur: () => {
      requestAnimationFrame(() => {
        multiSelectBoxRef.current?.blur();
      });
    },
    showMenu: () => {
      setMenuRequest('byKey');
    },
    hideMenu: () => {
      setMenuRequest(null);
    },
  }), []);


  /**
   * Handler for the synthetic React event "onClick" of the native main element of the multiple
   * select box to show the selection menu.
   */
  const handleClick: React.MouseEventHandler<HTMLSpanElement> = (event) => {
    event.stopPropagation();
    setMenuRequest('byClick');
  };


  /**
   * Handler for the synthetic React event "onKeyDown" of the native main element of the multiple
   * select box to show or hide the selection menu.
   */
  const handleKeyDown: React.KeyboardEventHandler<HTMLSpanElement> = (event) => {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case ' ':
        if (!showMenu) {
          event.stopPropagation();
          setMenuRequest('byKey');
        }
        break;

      case 'Tab':
        if (showMenu) {
          event.stopPropagation();
          setMenuRequest(null);
        }
        break;

      case 'Enter':
        if (showMenu) {
          event.stopPropagation();
          setMenuRequest(null);
          multiSelectBoxRef.current?.focus();
        }
        break;

      case 'Escape':
        if (showMenu) {
          event.stopPropagation();
          setMenuRequest(null);
          multiSelectBoxRef.current?.focus();
        } else if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        break;

      // no default
    }
  };


  /**
   * Handler for the callback prop "onCompleteSelection" of the sub-component "Menu" to select all
   * or none of the enabled options by calling callback prop "onSelect".
   */
  const handleCompleteSelection: React.ComponentProps<typeof Menu>['onCompleteSelection'] = ({ event }) => {
    const nextValue = (isCompleteSelectionOfEnabledOptions !== true);
    // Every option that can be chosen takes the new value. One that has it already keeps whatever
    // the consumer stored for it - the values are read as truthy or falsy and may carry more - and a
    // disabled one is left as it is.
    const nextValues: Record<string, unknown> = { ...values };

    optionsWithValues.forEach(({ id: optionId, value, isDisabled: isOptionDisabled }) => {
      if (!isOptionDisabled && (value !== nextValue)) {
        nextValues[optionId] = nextValue;
      }
    });

    onSelect?.({ values: nextValues, event });
  };


  /**
   * Handler for the callback prop "onToggleOption" of the sub-component "Menu".
   */
  const handleToggleOption: React.ComponentProps<typeof Menu>['onToggleOption'] = ({ id: optionId, event }) => {
    onSelect?.({
      values: { ...values, [optionId]: !values?.[optionId] },
      event,
    });
  };


  /**
   * Handler for the callback prop "onClose" of the sub-component "Menu".
   */
  const handleCloseMenu = () => {
    setMenuRequest(null);
  };


  /**
   * Handler for the callback prop "onPressEscape" of the sub-component "Menu" to close the menu and
   * give the focus back to the multiple select box, the same as Escape on the box itself.
   */
  const handlePressEscapeInMenu = () => {
    setMenuRequest(null);
    multiSelectBoxRef.current?.focus();
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  const { visibility } = useFadeInOut({ show: !!showMenu });


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  // The pane is the multiple select box's whole face: it holds the selection text, it answers the
  // pointer and it states the status, all on this one element. A multiple select box flush on both
  // sides carries both flush classes - there is no third class for it.
  const multiSelectBoxClasses = classNames(css.multiSelectBox, {
    [css.bare]: bare,
    [css.flushStart]: (flush === 'start') || (flush === 'both'),
    [css.flushEnd]: (flush === 'end') || (flush === 'both'),
    [css.disabled]: isDisabled,
    [css.busy]: (modStatus === MultiSelectBoxStatus.BUSY),
    [css.error]: (modStatus === MultiSelectBoxStatus.ERROR),
  });


  return (
    <span className={css.multiSelectBoxContr} style={outerElemStyle}>
      <span
        ref={multiSelectBoxRef}
        {...(id && { id })}
        role="listbox"
        className={multiSelectBoxClasses}
        {...(enableSelection && {
          tabIndex: 0,
          onClick: handleClick,
          onKeyDown: handleKeyDown,
        })}
      >
        <Text disable={isDisabled} noSelection={((noSelectionHint !== '') && !isCompleteSelection) || !areEnabledOptions} text={text} />
        <IconForControls disable={isDisabled} icon="NAVIDOWN" showSpinner={modStatus === MultiSelectBoxStatus.BUSY} />
      </span>
      {!!notice && (
        <NoticeForControls disable={isDisabled} notice={notice} isErrorText={(modStatus === MultiSelectBoxStatus.ERROR)} />
      )}
      {(visibility !== 'hide') && (
        <Menu
          multiSelectBoxRef={multiSelectBoxRef}
          show={(visibility === 'fadeIn') || (visibility === 'show')}
          showByClick={showMenu === 'byClick'}
          limit={limitMenu}
          hideAllOrNoneCheckbox={hideAllOrNoneCheckbox}
          searchBox={searchBox}
          options={optionsWithValues}
          selectionText={text}
          isCompleteSelection={isCompleteSelection}
          onCompleteSelection={handleCompleteSelection}
          onToggleOption={handleToggleOption}
          onClose={handleCloseMenu}
          onPressEscape={handlePressEscapeInMenu}
        />
      )}
    </span>
  );
  //                                                                                  </editor-fold>
};

MultiSelectBox.displayName = 'MultiSelectBox';


export { MultiSelectBox };
