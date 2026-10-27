import {
  Children, cloneElement, isValidElement, useImperativeHandle, useRef,
} from 'react';

import { Scrolling, type ScrollingHandle } from 'components/helpers/scrolling';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { Toolbar, type ToolbarProps } from 'components/layouts/toolbar';
import { classNames } from 'utils/classNames';

import * as css from './tabular.scss';
import { type TabularItemInjectedProps, type TabularProps, tabularStylingProps } from './tabular.types';
import { TabularContrItem } from './tabularContrItem/TabularContrItem';
import { TabularDescItem } from './tabularDescItem/TabularDescItem';
import type { TabularDescItemProps } from './tabularDescItem/tabularDescItem.types';
import { TabularValueItem } from './tabularValueItem/TabularValueItem';


/**
 * Function that returns true, if a child of the given type belongs to a sequence of consecutive
 * items: the sub-components "TabularContrItem" and "TabularValueItem" as well as the layout
 * component "Toolbar" do, everything else does not.
 */
const isSequenceMember = (childType: unknown): boolean => (
  (childType === Toolbar) || (childType === TabularContrItem) || (childType === TabularValueItem)
);


/**
 * React component of the layout component "Tabular", a simple table containing predefined child
 * containers, for dashboard contents of VtWebGuiFramework.
 */
const Tabular = ({
  ref, id, tabBarItemId = '', tabularStyle = 'line', itemPaddingTopBottom = 'xs',
  itemPaddingLeftRight, itemBackgroundColor, itemBorderRadius, scrollBarV = false, rowGap = 'xs',
  children, ...restProps
}: TabularProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const tabularElemRef = useRef<HTMLDivElement>(null);
  const scrollingHandleRef = useRef<ScrollingHandle>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isScrolling = !!scrollBarV;
  const isBackgroundStyle = (tabularStyle === 'background');
  // The spacing of the items, the same at both styles: the vertical one is the inner height of an
  // entry, the horizontal one lines the entries up - along the tabular's edge at "line", inside each
  // item's own surface at "background", which is why its default differs by style.
  const itemSpacingTopBottom = (itemPaddingTopBottom === 'none') ? undefined : itemPaddingTopBottom;
  const modItemPaddingLeftRight = itemPaddingLeftRight ?? (isBackgroundStyle ? 'small' : 'none');
  const itemSpacingLeftRight = (modItemPaddingLeftRight === 'none') ? undefined : modItemPaddingLeftRight;

  // The styling props always reach the tabular's own surface, at both styles. The row gap is the
  // seam between two item surfaces, so it is added at the style "background" alone.
  const { outerElemStyle, innerElemStyle, elemStyle } = useStylingProps(
    { ...restProps, ...(isBackgroundStyle && { rowGap }) }, tabularStylingProps, { addCombinedStyle: !isScrolling },
  );


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Function that returns the styling props an item carries at its position within its sequence of
   * consecutive items. The spacing goes to every item at both styles. The colour and the radius
   * reach the items at the style "background" alone, where an item is a surface of its own, and of
   * the radius only the first item of a sequence takes the top pair of corners and only the last one
   * the bottom pair: those are the two that show a corner.
   */
  const getItemStylingProps = (isFirstOfSequence: boolean, isLastOfSequence: boolean) => ({
    ...(itemSpacingTopBottom && { paddingTop: itemSpacingTopBottom, paddingBottom: itemSpacingTopBottom }),
    ...(itemSpacingLeftRight && { paddingRight: itemSpacingLeftRight, paddingLeft: itemSpacingLeftRight }),
    ...(isBackgroundStyle && {
      ...(itemBackgroundColor && { backgroundColor: itemBackgroundColor }),
      ...((isFirstOfSequence && itemBorderRadius) && {
        borderTopLeftRadius: itemBorderRadius, borderTopRightRadius: itemBorderRadius,
      }),
      ...((isLastOfSequence && itemBorderRadius) && {
        borderBottomRightRadius: itemBorderRadius, borderBottomLeftRadius: itemBorderRadius,
      }),
    }),
  });


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    clientLeft: tabularElemRef.current?.clientLeft,
    clientWidth: tabularElemRef.current?.clientWidth,
    clientTop: tabularElemRef.current?.clientTop,
    clientHeight: tabularElemRef.current?.clientHeight,
    getBoundingClientRect: () => tabularElemRef.current?.getBoundingClientRect(),
    contains: (other: Node | null) => tabularElemRef.current?.contains(other),
    ...scrollingHandleRef.current,
  }), []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const childList = Children.toArray(children);
  const childTypes: unknown[] = childList.map((child) => (isValidElement(child) ? child.type : null));

  const content = childList.map((child, idx) => {
    // a toolbar always starts a new sequence, so it also ends the sequence before it
    const isFirstOfSequence = (childTypes[idx] === Toolbar) || !isSequenceMember(childTypes[idx - 1]);
    const isLastOfSequence = !isSequenceMember(childTypes[idx + 1]) || (childTypes[idx + 1] === Toolbar);

    // A toolbar is an entry like any other and takes the same styling props; the props it was given
    // at the call site win over them. Its line is the exception: that one states the tabular's style
    // and is not the call site's to choose.
    if (isValidElement<ToolbarProps>(child) && (child.type === Toolbar)) {
      return cloneElement(child, {
        ...getItemStylingProps(isFirstOfSequence, isLastOfSequence),
        ...child.props,
        withLine: !isBackgroundStyle,
      });
    }

    if (
      isValidElement<TabularItemInjectedProps>(child)
      && ((child.type === TabularContrItem) || (child.type === TabularValueItem))
    ) {
      return cloneElement(child, {
        tabularStyle,
        ...getItemStylingProps(isFirstOfSequence, isLastOfSequence),
      });
    }

    // A description item carries no surface of its own at either style, so it takes no colour and no
    // radius. What it does need is the horizontal spacing of the items, so that its text lines up
    // with theirs. Its vertical spacing is its own, being smaller than an entry's (see its
    // stylesheet).
    if (isValidElement<TabularDescItemProps>(child) && (child.type === TabularDescItem)) {
      return cloneElement(child, {
        tabularStyle,
        ...(itemSpacingLeftRight && { paddingRight: itemSpacingLeftRight, paddingLeft: itemSpacingLeftRight }),
      });
    }

    return null;
  });

  const hasContactPane = (restProps.boxShadow === 'contact');
  const tabularClasses = classNames(css.tabular, {
    [css.tabularStyleIsLine]: !isBackgroundStyle,
    // A scrolling tabular draws its pane on the outer element, the one that carries its background.
    [css.contactPane]: hasContactPane && !isScrolling,
  });

  // Tabular with scroll bar.
  if (isScrolling) {
    return (
      <Scrolling
        ref={scrollingHandleRef}
        {...(id && { id })}
        {...(tabBarItemId && { tabBarItemId })}
        {...(hasContactPane && { className: css.contactPane })}
        style={outerElemStyle}
        vertical={scrollBarV}
      >
        <div className={tabularClasses} style={innerElemStyle}>
          {content}
        </div>
      </Scrolling>
    );
  }

  // Tabular without scroll bar.
  return (
    <div
      ref={tabularElemRef}
      {...(id && { id })}
      {...(tabBarItemId && { role: 'tabpanel', 'aria-labelledby': tabBarItemId })}
      className={tabularClasses}
      style={elemStyle}
    >
      {content}
    </div>
  );
  //                                                                                  </editor-fold>
};

Tabular.displayName = 'Tabular';


export { Tabular };
