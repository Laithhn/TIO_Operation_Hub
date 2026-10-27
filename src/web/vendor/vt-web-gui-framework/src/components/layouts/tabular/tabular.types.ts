import type { ColorKeys, SpaceKeys } from 'assets/styles';
import type { ScrollingHandle } from 'components/helpers/scrolling';
import type { StylingPropCollection } from 'components/hooks/useStylingProps';


/**
 * The styling props of the tabular. They reach the tabular's own surface at both styles (see prop
 * "tabularStyle" below): its padding, its background colour, its border radii and its shadow. What
 * an entry gets comes from the props "itemPaddingTopBottom", "itemPaddingLeftRight",
 * "itemBackgroundColor" and "itemBorderRadius" instead.
 *
 * "rowGap" is the seam between two item surfaces and therefore only has a meaning at the style
 * "background", where it defaults to "xs". At "line" the entries lie against one another and are
 * separated by their divider lines, so a row gap is dropped there.
 */
export const tabularStylingProps = [
  'gridArea',
  'placeSelf',
  'alignSelf',
  'justifySelf',
  'visible',
  'rowGap',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'markerTop',
  'markerRight',
  'markerBottom',
  'markerLeft',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
  'backgroundColor',
  'boxShadow',
] as const;

export type TabularStylingProps = Pick<StylingPropCollection, (typeof tabularStylingProps)[number]>;


/** The style in which a tabular separates its entries. */
export type TabularStyle = 'line' | 'background';


/**
 * The props that the layout component "Tabular" passes to its item sub-components "TabularContrItem"
 * and "TabularValueItem". They are set by the tabular alone and are not meant to be set by the user.
 */
export interface TabularItemInjectedProps {
  /** From Tabular: the style in which the tabular separates its entries. */
  readonly tabularStyle?: TabularStyle;
  /** From Tabular: the inner spacing of the item at its top, from the tabular's prop
   * "itemPaddingTopBottom". Set at both tabular styles - the vertical spacing is the inner height of
   * an entry and therefore always the item's own. */
  readonly paddingTop?: SpaceKeys;
  /** From Tabular: the inner spacing of the item at its bottom, from the tabular's prop
   * "itemPaddingTopBottom". Set at both tabular styles. */
  readonly paddingBottom?: SpaceKeys;
  /** From Tabular: the inner spacing of the item at its right side, from the tabular's prop
   * "itemPaddingLeftRight". Set at both tabular styles, so the entries line up at "line" as well. */
  readonly paddingRight?: SpaceKeys;
  /** From Tabular: the inner spacing of the item at its left side, from the tabular's prop
   * "itemPaddingLeftRight". Set at both tabular styles. */
  readonly paddingLeft?: SpaceKeys;
  /** From Tabular: the background colour of the item. Only set at the tabular style "background",
   * where each item is a surface of its own; at "line" the tabular carries the colour. */
  readonly backgroundColor?: ColorKeys;
  /** From Tabular: rounds the top-left corner of the item. Only set for the first item of a sequence
   * of consecutive items and only at the tabular style "background". */
  readonly borderTopLeftRadius?: SpaceKeys;
  /** From Tabular: rounds the top-right corner of the item. Only set for the first item of a
   * sequence of consecutive items and only at the tabular style "background". */
  readonly borderTopRightRadius?: SpaceKeys;
  /** From Tabular: rounds the bottom-right corner of the item. Only set for the last item of a
   * sequence of consecutive items and only at the tabular style "background". */
  readonly borderBottomRightRadius?: SpaceKeys;
  /** From Tabular: rounds the bottom-left corner of the item. Only set for the last item of a
   * sequence of consecutive items and only at the tabular style "background". */
  readonly borderBottomLeftRadius?: SpaceKeys;
}


export type TabularHandle = {
  clientLeft: Element['clientLeft'] | undefined;
  clientWidth: Element['clientWidth'] | undefined;
  clientTop: Element['clientTop'] | undefined;
  clientHeight: Element['clientHeight'] | undefined;
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
  contains: (other: Node | null) => ReturnType<Element['contains']> | undefined;
} & Partial<ScrollingHandle>;


/** The props of the React component of the layout component "Tabular". */
export interface TabularProps extends TabularStylingProps {
  /** The React reference of an imperative handle of the tabular component. */
  readonly ref?: React.Ref<TabularHandle | null>;
  /** Optionally, an ID for the HTML attribute "id" of the tabular, written in every build - for
   * example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. A tabular with a scroll bar carries it on
   * its outer element, the one the scrolling wraps it in. */
  readonly id?: string;
  /** Optionally, the ID of the tab a tab bar switches this tabular with (see the prop "id" of the
   * tab items of "TabBar"). It writes two ARIA attributes at once: the tabular's role becomes
   * "tabpanel", and "aria-labelledby" names that tab, so that a screen reader reading the tabular
   * says which tab it belongs to. The tab states the other direction through its prop "panelId",
   * which takes this tabular's own "id" - one of the two without the other leaves the pair half
   * spoken. */
  readonly tabBarItemId?: string;
  /** This prop determines how the entries of the tabular are separated from each other. The tabular
   * is a surface of its own at both styles, which its styling props shape.
   *
   * At "line" (default) a divider line below each entry separates them. The last entry never draws
   * one, there being nothing below it to separate.
   *
   * At "background" each entry is a surface of its own as well, coloured and rounded through the
   * props "itemBackgroundColor" and "itemBorderRadius", and a fixed gap between them lets the
   * tabular's own surface show through as the separation. */
  readonly tabularStyle?: TabularStyle;
  /** The spacing above and below the content of each entry, the inner height of an entry. It is the
   * same at both styles and defaults to "xs"; "none" leaves it out. */
  readonly itemPaddingTopBottom?: SpaceKeys | 'none';
  /** The spacing left and right of the content of each entry, a description included, so that the
   * entries line up with one another. It defaults to "none" at the style "line", where the entries
   * share the tabular's surface, and to "small" at "background", where each is a surface of its
   * own. */
  readonly itemPaddingLeftRight?: SpaceKeys | 'none';
  /** The background colour of each entry at the style "background", read at that style alone - an
   * entry at "line" has no surface of its own to colour. Without it, an entry at "background" takes
   * the palette's "lightGray". */
  readonly itemBackgroundColor?: ColorKeys;
  /** The rounding of the entries at the style "background", read at that style alone. It rounds the
   * outer corners of each sequence of consecutive entries only: the top pair of its first entry and
   * the bottom pair of its last. A description item ends a sequence, and a toolbar starts a new
   * one. */
  readonly itemBorderRadius?: SpaceKeys;
  /** Setting this prop to true displays a vertical scroll bar when the content of the tabular
   * exceeds the available space. If, on the other hand, a numerical value in pixels is given,
   * scrolling occurs at a fixed increment. */
  readonly scrollBarV?: boolean | number;
  /** The content of the tabular. Only the components "Toolbar", "TabularContrItem",
   * "TabularDescItem" and "TabularValueItem" are rendered, everything else is dropped. */
  readonly children?: React.ReactNode;
}
