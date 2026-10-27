import {
  useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState,
} from 'react';

import { selectViewportWidth } from 'app/app.slice';
import { getSpaceKeyFromValue, layout, typo } from 'assets/styles';
import { useFadeInOut } from 'components/hooks/useFadeInOut';
import { useSelector } from 'components/hooks/useSelector';
import { Section, type SectionHandle } from 'components/layouts/section';
import { Card, type CardProps } from 'components/popups/card';
import { measureText } from 'utils/measureText';
import { isNonEmptyString, isNumber } from 'utils/type';

import { Marker } from './marker/Marker';
import { Proposal } from './proposal/Proposal';
import type { FilteredList, ProposalListProps } from './proposalList.types';


const paddingTopKey = getSpaceKeyFromValue(layout.controlMenus.paddingTop);
const paddingBottomKey = getSpaceKeyFromValue(layout.controlMenus.paddingBottom);
// the rounding every popup world of a control carries, translated into the key the card takes
const borderRadiusKey = getSpaceKeyFromValue(layout.controlMenus.borderRadius);


/**
 * React sub-component of the control component "Input" to show a proposal list.
 */
const ProposalList = ({
  ref, spanElemRef, show, list, value, emptyHint, onSelect, onClose,
}: ProposalListProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const viewportWidth = useSelector(selectViewportWidth);

  // If set, the marked index is the real array index of filteredList (see below).
  const [markedIdx, setMarkedIdx] = useState<number | null>(null);

  // The filtered list the marking belongs to. It is held in a state and not in a ref because the
  // marking is cleared in the render body, which is where the comparison against it stands.
  const [prevFilteredList, setPrevFilteredList] = useState<FilteredList | null>(null);

  // The measurements of the input element this list places itself against: the left edge it lines up
  // with and the width it is at least as wide as. Only the committed DOM can give them, so they are
  // taken in the effects below and kept here instead of being read off the ref during render.
  const [inputDims, setInputDims] = useState<{ left: number; clientWidth: number } | null>(null);

  const sectionRef = useRef<SectionHandle>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { visibility } = useFadeInOut({ show });

  // It keeps its useMemo: an effect lists it in its dependencies, and react-hooks/exhaustive-deps,
  // which does not know the React Compiler, asks for a stable identity there.
  const filteredList = useMemo<FilteredList>(() => {
    const testValue = value.toLowerCase();
    const testValueLength = testValue.length;

    return list
      .map((entry, idx) => ({
        listIdx: idx,
        entry: (isNumber(entry) ? entry.toString() : entry),
      }))
      .filter(({ entry }) => (
        isNonEmptyString(entry)
        && (
          (testValue === '')
          || entry.toLowerCase().includes(testValue)
        )
      ))
      .map(({ listIdx, entry }) => {
        let formattedEntry = entry;

        if (testValue !== '') {
          const start = entry.toLowerCase().indexOf(testValue);
          const end = start + testValueLength;

          formattedEntry = `${entry.slice(0, start)}[b]${entry.slice(start, end)}[/b]${entry.slice(end)}`;
        }

        return { listIdx, entry, formattedEntry };
      });
  }, [list, value]);

  // The marking is an index into the filtered list, so it says nothing about any other list: a list
  // that changed - the user typed - takes it with it, and so does the list going away. Clearing it
  // here rather than in an effect is what keeps it off the wrong entry: an effect runs after the
  // render that already showed the new list, and for the length of that frame the marking sits where
  // the old index pointed. The comparison is the guard that keeps the render-body setState from
  // looping.
  const hasListChanged = (filteredList !== prevFilteredList);

  if (hasListChanged) {
    setPrevFilteredList(filteredList);
  }
  if ((markedIdx !== null) && (hasListChanged || (visibility === 'hide'))) {
    setMarkedIdx(null);
  }

  const markerTop = (markedIdx !== null)
    ? layout.controlMenus.paddingTop + (markedIdx * layout.controlMenus.optionHeight)
    : null;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to derive the height, the right edge and the width of the list from the input
   * it belongs to, the viewport and the list itself.
   */
  const deriveListDims = () => {
    const { left: inputLeft, clientWidth: inputWidth } = inputDims ?? {};

    // Derive the complete height of the visible menu in pixels with at least one entry.
    const h = layout.controlMenus.paddingTop + layout.controlMenus.paddingBottom
      + (Math.max(1, filteredList.length) * layout.controlMenus.optionHeight);

    // Derive the maximum width of the texts of all proposals plus the empty hint and 20 pixels for
    // the scrollbar. Note that font weight "semibold" is used due to the use of bbCode "b" inside
    // the texts.
    const w = Math.min(
      viewportWidth - (2 * layout.controlMenus.spaceToDocument),
      [{ entry: emptyHint }, ...filteredList].reduce((acc, { entry }) => Math.max(
        acc,
        measureText(entry, { fontWeight: typo.fontWeight.semibold, fontSize: typo.typoSet.value.small.fontSize }) + 20,
      ), inputWidth ?? 0) + layout.controlMenus.optionPaddingLeft + layout.controlMenus.optionPaddingRight,
    );

    // Derive the right position of the proposal list.
    const r = Math.max(
      layout.controlMenus.spaceToDocument,
      viewportWidth - (inputLeft ?? 0) + layout.controlMenus.optionPaddingLeft - w,
    );

    return {
      listHeight: h,
      listRight: r,
      listWidth: w,
    };
  };


  const { listHeight, listRight, listWidth } = deriveListDims();


  /**
   * Helper function to measure the input element this list places itself against.
   * It is called once the list is mounted and at every "domChange" afterwards, so that the list
   * follows an input that moves or changes its width.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const measureInput = useCallback(() => {
    // A "domChange" can reach this while the input is unmounting, its ref detached already; there is
    // nothing to measure then.
    const inputElem = spanElemRef.current;

    if (inputElem) {
      const { left } = inputElem.getBoundingClientRect();
      const { clientWidth } = inputElem;

      setInputDims((prevValue) => (
        ((prevValue?.left !== left) || (prevValue.clientWidth !== clientWidth))
          ? { left, clientWidth }
          : prevValue
      ));
    }
  }, [spanElemRef]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    markPrevious: () => {
      setMarkedIdx((prevValue) => {
        if (filteredList.length <= 0) {
          return null;
        }

        if (prevValue === null) {
          sectionRef.current?.scrollToBottom?.();
          return (filteredList.length - 1);
        }

        if (prevValue === 0) {
          sectionRef.current?.scrollToTop?.();
          return 0;
        }

        const nextValue = prevValue - 1;

        if (sectionRef.current) {
          const { clientHeight, scrollHeight, scrollTop } = sectionRef.current;
          const minScrollTop = (nextValue * layout.controlMenus.optionHeight) + layout.controlMenus.paddingTop;

          if (
            clientHeight && scrollHeight && scrollTop
            && (scrollHeight > clientHeight)
            && (minScrollTop < scrollTop)
          ) {
            sectionRef.current.scrollVertically?.(minScrollTop - scrollTop);
          }
        }

        return nextValue;
      });
    },
    markNext: () => {
      setMarkedIdx((prevValue) => {
        if (filteredList.length <= 0) {
          return null;
        }

        if (prevValue === null) {
          sectionRef.current?.scrollToTop?.();
          return 0;
        }

        if (prevValue >= (filteredList.length - 1)) {
          sectionRef.current?.scrollToBottom?.();
          return filteredList.length - 1;
        }

        const nextValue = prevValue + 1;

        if (sectionRef.current) {
          const { clientHeight, scrollHeight, scrollTop } = sectionRef.current;
          const minScrollTop = ((nextValue + 1) * layout.controlMenus.optionHeight) + layout.controlMenus.paddingTop;

          if (
            clientHeight && scrollHeight && scrollTop
            && (scrollHeight > clientHeight)
            && (minScrollTop > (clientHeight + scrollTop))
          ) {
            sectionRef.current.scrollVertically?.(minScrollTop - clientHeight - scrollTop);
          }
        }

        return nextValue;
      });
    },
    selectMarked: () => {
      if ((markedIdx !== null) && filteredList[markedIdx]) {
        onSelect(filteredList[markedIdx].listIdx);
      } else if (filteredList.length === 1) {
        onSelect(filteredList[0]!.listIdx);
      }
      setMarkedIdx(null);
    },
  }), [onSelect, markedIdx, filteredList]);


  /**
   *
   */
  const handleMoveCard: NonNullable<CardProps['onMoveAnchorElem']> = ({ isPlacedOutside }) => {
    if (isPlacedOutside) {
      onClose();
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // The first measurement runs before the browser paints, so the list is never seen at the position
  // it would have without one.
  useLayoutEffect(() => {
    measureInput();
  }, [measureInput]);


  useEffect(() => {
    document.addEventListener('domChange', measureInput);

    return () => {
      document.removeEventListener('domChange', measureInput);
    };
  }, [measureInput]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (visibility === 'hide') {
    return null;
  }

  return (
    <Card
      {...(borderRadiusKey && { borderRadius: borderRadiusKey })}
      show={(visibility === 'fadeIn') || (visibility === 'show')}
      right={listRight}
      width={listWidth}
      top={-layout.controlMenus.spaceToDocument}
      bottom={-layout.controlMenus.spaceToDocument}
      height={listHeight}
      anchorElemRef={spanElemRef}
      onMoveAnchorElem={handleMoveCard}
    >
      <Section
        ref={sectionRef}
        relativePosition
        gridAutoRows={`${layout.controlMenus.optionHeight}px`}
        justifyItems="start"
        {...(!!paddingTopKey && { paddingTop: paddingTopKey })}
        {...(!!paddingBottomKey && { paddingBottom: paddingBottomKey })}
        scrollBarV
      >
        {(filteredList.length > 0)
          ? (
            <>
              {(markerTop !== null) && <Marker top={markerTop} />}
              {filteredList.map(({ listIdx, formattedEntry }) => (
                <Proposal
                  key={listIdx}
                  idx={listIdx}
                  text={formattedEntry}
                  onClick={onSelect}
                />
              ))}
            </>
          )
          : (
            <Proposal idx={-1} text={emptyHint || '\u{a0}'} />
          )}
      </Section>
    </Card>
  );
  //                                                                                  </editor-fold>
};

ProposalList.displayName = 'ProposalList';


export { ProposalList };
