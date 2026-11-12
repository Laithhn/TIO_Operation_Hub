import type { ColorKeys, Ground } from 'assets/styles';
import type { StylingPropCollection } from 'components/hooks/useStylingProps';


export const tabBarStylingProps = [
  'gridArea',
  'visible',
  'borderRadius',
  'backgroundColor',
] as const;

export type TabBarStylingProps = Pick<StylingPropCollection, (typeof tabBarStylingProps)[number]>;


/** The side of its content a tab bar lies on. */
export type TabBarPos = 'top' | 'bottom' | 'left' | 'right';

/** The ID of a tab: a non-empty string, unique in the whole document - the tab writes it to its
 * HTML attribute "id", so the bar's own scope is not enough. */
export type TabBarItemId = string;

/** The event of a click on a tab: a pointer, a mouse, or the keyboard with Enter or Space. */
export type TabBarItemClickEvent = React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>;


export interface TabBarHandle {
  clientLeft: Element['clientLeft'] | undefined;
  clientWidth: Element['clientWidth'] | undefined;
  clientTop: Element['clientTop'] | undefined;
  clientHeight: Element['clientHeight'] | undefined;
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
}


/** What a tab item exposes to its tab bar through the ref the bar injects: where the item begins
 * along the bar's axis and how long it is, measured from the bar's scrolling container at a scroll
 * offset of zero. The bar places its marker by it and scrolls the item into view. */
export interface TabBarItemHandle {
  getPosition: (isVertical: boolean) => { offset: number; dim: number } | undefined;
  focus: () => void;
}


/** The props the tab bar injects into every tab item as it renders it. They are set by the tab bar
 * alone and are not meant to be set at the call site. */
export interface TabBarItemInjectedProps {
  /** From TabBar: whether the tab is the selected one, which its ARIA attribute states. */
  readonly selected?: boolean;
  /** From TabBar: whether this is the tab the keyboard enters the bar at. A tab bar is one stop of
   * the tab sequence, not one per tab, and the arrow keys travel inside it once it is entered (the
   * ARIA tabs pattern), so exactly one tab is reachable by the tab key and the others are reachable
   * by script alone. */
  readonly keyboardEntry?: boolean;
  /** From TabBar: the ground of the filled marker the tab stands on, set on the selected tab of a
   * bar with a background marker alone. The marker is opaque and carries a colour of its own, which
   * is that tab's ground; every other tab stands on the bar's ground and reads it by itself. */
  readonly markerGround?: Ground;
  /** From TabBar: the bar's own prop of that name, which decides the tab's interaction appearance.
   * A bar with a lens gives every tab a bounded area of its own, and the tab shows the interaction
   * veil over it; a bar with a background marker packs its tabs at its start, where an unselected
   * tab is no wider than its lettering and has no area to veil, and the tab shows the interaction
   * underline instead. */
  readonly backgroundMarker?: boolean;
}


/** The props every tab item shares, whatever it shows. */
export interface TabBarItemBaseProps extends TabBarItemInjectedProps {
  /** The React reference of an imperative handle of the tab item. The tab bar sets it itself. */
  readonly ref?: React.Ref<TabBarItemHandle | null>;
  /** The ID of the tab. It is written to the HTML attribute "id" in every build, and it is the name
   * the tab bar knows the tab by: the bar marks the tab whose ID equals its prop "selectedId", and
   * the callback prop "onClick" returns it. As an HTML ID it has to be unique in the whole
   * document, not only within the tab bar, and IDs starting with "viwgf_" are reserved for the
   * framework. */
  readonly id: TabBarItemId;
  /** Optionally, the ID of the panel the tab switches to - the HTML ID of the element that holds
   * that panel's content, which the tab writes to its ARIA attribute "aria-controls". It is what
   * lets a screen reader say what the tab opens. The other direction belongs to the panel: the
   * layout components take the tab's own ID in their prop "tabBarItemId", which makes them a panel
   * and names this tab as their label. Set one without the other and the pair stays half spoken. */
  readonly panelId?: string;
  /** Setting this prop to true marks the tab as disabled: it cannot be clicked or reached by the
   * keyboard. */
  readonly disable?: boolean;
  /** Callback prop that is called as soon as the tab is clicked, by a pointer or by the keyboard
   * with Enter or Space. A disabled tab does not call it. It reports the ID of the tab. */
  readonly onClick?: ({ id, event }: { id: TabBarItemId; event: TabBarItemClickEvent }) => void;
}


/** The props of the React component of the control component "TabBar". */
export interface TabBarProps extends TabBarStylingProps {
  /** The React reference of an imperative handle of the tab bar component. */
  readonly ref?: React.Ref<TabBarHandle | null>;
  /** Optionally, an ID for the HTML attribute "id" of the tab bar, written in every build - for
   * example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. The tabs carry IDs of their own (see the
   * prop "id" of the tab items). */
  readonly id?: string;
  /** The side of its content the tab bar lies on: above it ("top", default), below it ("bottom"),
   * or beside it ("left" or "right"), where the tabs stack vertically. The side also says which
   * corners the styling prop "borderRadius" rounds: the two that face away from the content - the
   * top corners of a bar above it - never all four. A background marker takes those two corners as
   * well, reaching the bar's edge as it does; a lens has a rounding of its own. */
  readonly pos?: TabBarPos;
  /** The ID of the selected tab (see the prop "id" of the tab items), which the marker points out;
   * null selects none. The tab bar only shows the selection: the consumer sets it, typically from
   * the callback prop "onClick" of the tabs. Default value: null. */
  readonly selectedId?: TabBarItemId | null;
  /** With this prop set to true, the marker of the selected tab is drawn as the tab's background
   * rather than as a lens behind its lettering (default). The two are two placements: the lens
   * suits a bar lying in its content, on the content's own colour, where it lies on that colour as
   * a body of glass; the background marker suits a bar standing at the content's edge on the
   * surrounding ground, where a marker in the content's colour (see the prop "markerColor") lets
   * the selected tab run into the content - the classic tabs. */
  readonly backgroundMarker?: boolean;
  /** The colour of the marker, any colour of the palette. Without it, the lens is tinted in
   * "attention" - the colour that says which of several things is the one switched on - and a
   * background marker filled in "offWhite". The lens carries the colour translucent, so that the
   * bar's ground reads through it; the background marker carries it in full. */
  readonly markerColor?: ColorKeys;
  /** The tabs: components "TabBarTitleItem" and "TabBarContrItem", in the order they are shown.
   * Anything else among the children is dropped. */
  readonly children?: React.ReactNode;
}
