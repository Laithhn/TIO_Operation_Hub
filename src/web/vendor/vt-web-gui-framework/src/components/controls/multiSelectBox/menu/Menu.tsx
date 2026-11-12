import {
  useCallback, useEffect, useId, useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';

import {
  getSpaceKeyFromValue, layout, space, typo,
} from 'assets/styles';
import { CheckBox, type CheckBoxHandle, CheckBoxStatus } from 'components/controls/checkBox';
import { Input, type InputHandle } from 'components/controls/input';
import { useI18n } from 'components/hooks/useI18n';
import type { StylingPropCollection } from 'components/hooks/useStylingProps';
import { Text } from 'components/indicators/text';
import { Section } from 'components/layouts/section';
import { classNames } from 'utils/classNames';
import { getViewportDims } from 'utils/getViewportDims';
import { measureText } from 'utils/measureText';

import * as css from './menu.scss';
import type { MenuProps } from './menu.types';


const gapInsideHeader: StylingPropCollection['gap'] = 'small';
const optionPaddingLeft = getSpaceKeyFromValue(layout.controlMenus.optionPaddingLeft)!;
const optionPaddingRight = getSpaceKeyFromValue(layout.controlMenus.optionPaddingRight)!;

// The gap the stylesheet leaves between the header and the options, read from its ":export" block -
// which hands a number over as a string, css-loader knowing no other type for it. It is converted
// here because it is added to heights below: "72" + "20" is "7220", and a menu of that height, with
// room for no option at all, is what a header produced until 2026-09-03.
const gapBetweenHeaderAndOptions = Number(css.gapBetweenHeaderAndOptions);

// The width of an option without its text: the check box's icon box, which is as wide as a control is
// high and pulls its start margin back by the air around the glyph (see icon.scss), the gap between
// that box and the label, and the scroll bar beside the options.
const maxOptionWidthOffset = layout.controls.heightDefault
  - ((layout.controls.heightDefault - layout.controls.iconDimDefault) / 2)
  + space.xs
  + layout.scrolling.scrollBarThickness;

// The edge the menu draws around itself, which the glass gives it. It counts twice in the menu's
// height and width, and once between the menu's top edge and its first row.
const edgeWidth = 1;

const portalCntr = document.getElementById(process.env['ELEM_ID_TEMP'] ?? '');


/**
 * Helper function to return the position of the given multiple select box element. Note that
 * "right" is the position of the right side of the element, measured from the right side of the
 * viewport. The same applies for "bottom".
 *
 * Nothing is rounded and the pane's margins are not corrected for, for the reasons the select box's
 * menu states at its own measurement: the menu is placed against the pane's drawn edge, which is
 * what getBoundingClientRect() returns, and every fraction taken off it moves the menu off the
 * control by that fraction.
 */
const getMultiSelectBoxDims = (ref: React.RefObject<HTMLSpanElement | null>) => {
  const multiSelectBoxRect = ref.current?.getBoundingClientRect();

  if (!multiSelectBoxRect) {
    return undefined;
  }

  const { width: viewportWidth, height: viewportHeight } = getViewportDims();

  return {
    left: multiSelectBoxRect.left,
    right: viewportWidth - multiSelectBoxRect.right,
    width: multiSelectBoxRect.width,
    top: multiSelectBoxRect.top,
    bottom: viewportHeight - multiSelectBoxRect.bottom,
  };
};


/**
 * React sub-component of the menu of the control component "MultiSelectBox".
 */
const Menu = ({
  multiSelectBoxRef, show, showByClick, limit, hideAllOrNoneCheckbox, searchBox, options,
  selectionText, isCompleteSelection, onCompleteSelection, onToggleOption, onClose, onPressEscape,
}: MenuProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = useI18n();

  // The pane is mounted whenever the menu is - "visibility" leaves "hide" only through a click, a key
  // or the imperative handle, and all three presuppose it - so the first measurement always finds a
  // pane, which is what the assertion stands on.
  const [multiSelectBoxDims, setMultiSelectBoxDims] = useState(getMultiSelectBoxDims(multiSelectBoxRef)!);
  const [searchStr, setSearchStr] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);
  const allOrNoneCheckBoxRef = useRef<CheckBoxHandle>(null);
  const searchBoxRef = useRef<InputHandle>(null);
  const allCheckBoxesRef = useRef<(CheckBoxHandle | null)[]>([]);
  const hasFocusedRef = useRef(false);
  const prevsRef = useRef<NonNullable<ReturnType<typeof getMultiSelectBoxDims>>>({
    ...multiSelectBoxDims,
  });


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // The HTML IDs of the elements of the focus ring, which the key handling below recognizes the
  // event target by, since the handles of the controls expose no element. An option takes its index
  // among the filtered options as the end of its ID.
  const idPrefix = `viwgf_${useId()}`;
  const allOrNoneCheckBoxId = `${idPrefix}allOrNoneCheckBox`;
  const searchBoxId = `${idPrefix}searchBox`;

  // It keeps its useMemo: a function an effect lists in its dependencies depends on it, and
  // react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
  // along that chain.
  const {
    menuHeightPx, menuTopPx, menuBottomPx, maxOptionWidth, showHeader, filteredOptions,
  } = useMemo(() => {
    // The search reads over the case on both sides: the text was lowered all along, the search string
    // was not until 2026-09-03, so a capital letter found nothing.
    const searchStrLower = searchStr.toLowerCase();
    const res = {
      menuHeightPx: '0px',
      menuTopPx: '0px',
      menuBottomPx: '0px',
      maxOptionWidth: 0,
      showHeader: (!hideAllOrNoneCheckbox || searchBox),
      filteredOptions: options.filter((option) => (
        !searchStrLower || option.text.toLowerCase().includes(searchStrLower)
      )),
    };

    // The height of the header with the optional all-or-none check box and / or the search box, and
    // the room it takes above the options together with the gap below it. Every row of the menu -
    // a header row as much as an option - is as tall as the pane (controls.heightDefault), so the
    // row lying on the pane covers it exactly and no offset between the two is left to compute.
    const headerHeight = ((Number(!hideAllOrNoneCheckbox) + Number(searchBox)) * layout.controls.heightDefault)
      + ((!hideAllOrNoneCheckbox && searchBox) ? space[gapInsideHeader] : 0);
    const headerRoom = headerHeight + (headerHeight ? gapBetweenHeaderAndOptions : 0);

    // What stands between the menu's edge and the row lying on the pane, above as below: the edge
    // the glass draws and the menu's own padding. Opening downwards, the menu's top edge lies that
    // far above the pane's top edge; opening upwards, its bottom edge that far below the pane's.
    const offsetTop = edgeWidth + layout.controlMenus.paddingTop;
    const offsetBottom = edgeWidth + layout.controlMenus.paddingBottom;

    // The number of options the menu can hold in either direction, the row on the pane included.
    // Downwards the first row - the header's first row, or the first option - lies on the pane and
    // everything else hangs below it into the room the viewport leaves there; upwards the last
    // option lies on the pane and the header, if any, stands above the options. The pane's own row
    // counts once, which is the "+ heightDefault" in both.
    const maxOpts2Top = Math.max(0, Math.floor(
      (multiSelectBoxDims.top + layout.controls.heightDefault - offsetTop - headerRoom - layout.controlMenus.spaceToDocument)
      / layout.controlMenus.optionHeight,
    ));
    const maxOpts2Bottom = Math.max(0, Math.floor(
      (multiSelectBoxDims.bottom + layout.controls.heightDefault - offsetBottom - headerRoom - layout.controlMenus.spaceToDocument)
      / layout.controlMenus.optionHeight,
    ));

    const openToTheTop = (
      (Math.min(Math.max(1, limit), options.length) > maxOpts2Bottom)
      && (maxOpts2Top > maxOpts2Bottom)
    );
    const numOptsToShow = Math.min(
      Math.min(Math.max(1, limit), res.filteredOptions.length),
      openToTheTop ? maxOpts2Top : maxOpts2Bottom,
    );

    // The height of the visible menu in pixels. The two edges are part of it because box-sizing is
    // border-box everywhere: a height set without them would take their two pixels off the room the
    // options have and cut the last one.
    const menuHeight = headerRoom
      + layout.controlMenus.paddingTop + layout.controlMenus.paddingBottom
      + (numOptsToShow * layout.controlMenus.optionHeight)
      + (2 * edgeWidth);

    res.menuTopPx = openToTheTop ? 'auto' : `${multiSelectBoxDims.top - offsetTop}px`;
    res.menuBottomPx = openToTheTop ? `${multiSelectBoxDims.bottom - offsetBottom}px` : 'auto';
    res.menuHeightPx = `${menuHeight}px`;

    // The width of the widest option, its check box icon and the scroll bar included, measured as
    // the room the menu's content needs; the menu's own padding and edges are added where the width
    // is set. The menu covers the control - same right edge, and at least its width - so the
    // comparison against the pane's width takes those additions into account.
    res.maxOptionWidth = options.reduce((acc, o) => (
      Math.max(acc, measureText(o.text, { fontWeight: typo.typoSet.value.small.fontWeight, fontSize: typo.typoSet.value.small.fontSize }) + maxOptionWidthOffset)
    ), 0);

    return res;
  }, [limit, hideAllOrNoneCheckbox, searchBox, options, multiSelectBoxDims, searchStr]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to list the elements of the menu the keys move the focus
   * between, in their order: the all-or-none check box and the search box where the header carries
   * them, then every option that can be chosen. The arrow keys and Home/End walk this ring, Tab and
   * Shift+Tab wrap around its ends - the browser's own tab order inside it is the same.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const getFocusRing = useCallback(() => {
    const ring: { id: string; handle: { focus: () => void } }[] = [];

    if (allOrNoneCheckBoxRef.current) {
      ring.push({ id: allOrNoneCheckBoxId, handle: allOrNoneCheckBoxRef.current });
    }

    if (searchBoxRef.current) {
      ring.push({ id: searchBoxId, handle: searchBoxRef.current });
    }

    filteredOptions.forEach(({ isDisabled }, idx) => {
      const handle = allCheckBoxesRef.current[idx];

      if (!isDisabled && handle) {
        ring.push({ id: `${idPrefix}option${idx}`, handle });
      }
    });

    return ring;
  }, [idPrefix, allOrNoneCheckBoxId, searchBoxId, filteredOptions]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * React callback reference of the check boxes.
   */
  const checkBoxRefCallback: (node: CheckBoxHandle | null, idx: number) => (undefined | (() => void)) = (node, idx) => {
    if (!node) {
      return undefined;
    }

    allCheckBoxesRef.current[idx] = node;

    return () => {
      allCheckBoxesRef.current[idx] = null;
    };
  };


  /**
   * Handler for the callback prop "onChange" of the control component "Input" to enter the search
   * string.
   */
  const handleChangeSearchValue: NonNullable<React.ComponentProps<typeof Input>['onChange']> = ({ value }) => {
    setSearchStr(String(value ?? ''));
  };


  /**
   * Handler for the synthetic React event "onKeyDown" on the native main element of the menu: the
   * arrow keys and Home/End move the focus along the ring, Tab and Shift+Tab wrap around its ends and
   * leave every step inside it to the browser. All five keys stay inside the menu.
   *
   * Escape is handed to the multiple select box, which closes the menu and takes the focus back.
   * The key arrives here although the menu is portalled away from the pane: React lets a synthetic
   * event rise through the component tree rather than the DOM, and the check box or search box it
   * starts on only blurs itself without stopping it. It goes no further than the menu, so that a
   * modal window closed by Escape stays open - the same the pane's own Escape does.
   */
  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onPressEscape();
      return;
    }

    if (!['Tab', 'Home', 'End', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      return;
    }

    event.stopPropagation();

    const ring = getFocusRing();
    const last = ring.length - 1;

    if (last < 0) {
      return;
    }

    const idx = ring.findIndex(({ id }) => (id === (event.target as HTMLElement).id));
    let next: number | undefined;

    switch (event.key) {
      case 'Tab':
        if (!event.shiftKey && (idx === last)) {
          next = 0;
        } else if (event.shiftKey && (idx === 0)) {
          next = last;
        }
        break;

      case 'Home':
        next = 0;
        break;

      case 'End':
        next = last;
        break;

      case 'ArrowUp':
        next = (idx <= 0) ? last : idx - 1;
        break;

      case 'ArrowDown':
        next = ((idx < 0) || (idx === last)) ? 0 : idx + 1;
        break;

      // no default
    }

    if (next !== undefined) {
      if (event.key === 'Tab') {
        event.preventDefault();
      }

      ring[next]!.handle.focus();
    }
  };


  /**
   * Handler for the custom event "domChange" of the document to close the menu if
   * the dimensions of the multiple select box are changing.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const handleDomChange = useCallback(() => {
    const dims = getMultiSelectBoxDims(multiSelectBoxRef);

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
        setMultiSelectBoxDims(dims);
      }
    }

    prevsRef.current = { ...dims };
  }, [multiSelectBoxRef, onClose]);


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


  // Where the menu was opened by a key, the focus moves into it once, onto the first element of the
  // ring. Once, which the ref guards: until 2026-09-03 this ran again whenever the first option that
  // can be chosen changed its index, which typing into the search box does the moment the filter
  // leaves nothing selectable - and the focus jumped out of the field mid-word.
  useEffect(() => {
    if (!showByClick && !hasFocusedRef.current) {
      hasFocusedRef.current = true;
      getFocusRing()[0]?.handle.focus();
    }
  }, [showByClick, getFocusRing]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!portalCntr) {
    return null;
  }


  const menuClasses = classNames(css.menu, {
    [css.show]: show,
    [css.showHeader]: showHeader,
  });

  const menuStyle = {
    ...(isRtl ? { left: multiSelectBoxDims.left } : { right: multiSelectBoxDims.right }),
    // The menu covers the control: same right edge, and at least its width. Where the widest option
    // needs more room than the control has, the menu grows to the left of it. Until 2026-09-02 the
    // menu stood a full option padding wider than the control on both sides, by a negative margin in
    // the stylesheet that was right in v3, where the value had no horizontal padding and an option
    // had 12px; the pane carries the same padding now, so the compensation had become an overhang.
    width: `${Math.max(multiSelectBoxDims.width, maxOptionWidth + layout.controlMenus.optionPaddingLeft + layout.controlMenus.optionPaddingRight + (2 * edgeWidth))}px`,
    top: menuTopPx,
    bottom: menuBottomPx,
    height: menuHeightPx,
  };

  return createPortal(
    <div // eslint-disable-line jsx-a11y/no-static-element-interactions
      ref={menuRef}
      className={menuClasses}
      style={menuStyle}
      onKeyDown={handleKeyDown}
    >
      {showHeader && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <Section
          gridTemplateColumns="auto 1fr"
          gap={gapInsideHeader}
          alignItems="baseline"
          paddingRight={optionPaddingRight}
          paddingLeft={optionPaddingLeft}
        >
          {!hideAllOrNoneCheckbox && (
            <>
              <CheckBox
                ref={allOrNoneCheckBoxRef}
                id={allOrNoneCheckBoxId}
                value={isCompleteSelection}
                onClick={onCompleteSelection}
              />
              <Text textOverflowEllipsis type="label">{selectionText ? `(${selectionText})` : ''}</Text>
            </>
          )}
          {searchBox && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
            <Input
              ref={searchBoxRef}
              gridArea="auto / 1 / auto / -1"
              id={searchBoxId}
              {...(searchStr
                ? { deleteButton: true }
                : { trailingIcon: 'SEARCH' }
              )}
              value={searchStr}
              onChange={handleChangeSearchValue}
            />
          )}
        </Section>
      )}
      <Section
        gridAutoRows={`${layout.controlMenus.optionHeight}px`}
        justifyItems="start"
        paddingRight={optionPaddingRight}
        paddingLeft={optionPaddingLeft}
        scrollBarV
      >
        {filteredOptions.map(({
          id, value, text, isDisabled,
        }, idx) => (
          <CheckBox
            key={id}
            ref={(node) => checkBoxRefCallback(node, idx)}
            id={`${idPrefix}option${idx}`}
            status={isDisabled ? CheckBoxStatus.DISABLED : CheckBoxStatus.IDLE}
            label={text}
            value={value}
            onClick={({ event }) => {
              onToggleOption({ id, event });
            }}
          />
        ))}
      </Section>
    </div>,
    portalCntr,
  );
  //                                                                                  </editor-fold>
};

Menu.displayName = 'Menu';


export { Menu };
