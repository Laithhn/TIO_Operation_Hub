import type { ColorKeys } from 'assets/styles';
import { type ScrollingHandle } from 'components/helpers/scrolling';
import type { StylingPropCollection } from 'components/hooks/useStylingProps';


export const sectionStylingProps = [
  'relativePosition',
  'stickyPosition',
  'direction',
  'gridArea',
  'placeSelf',
  'alignSelf',
  'justifySelf',
  'maxWidth',
  'visible',
  'gridTemplateRows',
  'gridTemplateColumns',
  'gridTemplateAreas',
  'gridAutoFlow',
  'gridAutoRows',
  'gridAutoColumns',
  'gap',
  'rowGap',
  'columnGap',
  'placeContent',
  'alignContent',
  'justifyContent',
  'placeItems',
  'alignItems',
  'justifyItems',
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
  'backgroundImage',
  'backgroundOptions',
  'boxShadow',
  'textAlign',
  'overflowHidden',
] as const;

export type SectionStylingProps = Pick<StylingPropCollection, (typeof sectionStylingProps)[number]>;


export type SectionClickEvent = React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>;


export type SectionHandle = {
  clientLeft: Element['clientLeft'] | undefined;
  clientWidth: Element['clientWidth'] | undefined;
  clientTop: Element['clientTop'] | undefined;
  clientHeight: Element['clientHeight'] | undefined;
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
  contains: (other: Node | null) => ReturnType<Element['contains']> | undefined;
} & Partial<ScrollingHandle>;


/** The props of the React component of the layout component "Section", apart from the callback
 * "onClick" (see SectionClickProps below). */
export interface SectionBaseProps extends SectionStylingProps {
  /** The React reference of an imperative handle of the section component. */
  readonly ref?: React.Ref<SectionHandle | null>;
  /** Optionally, an ID for the HTML attribute "id" of the section, written in every build - for
   * example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. A section with a scroll bar carries the
   * ID on its outer element, the one the scrolling wraps it in, where the ID is the key the scroll
   * position is stored under as well. */
  readonly id?: string;
  /** Optionally, the ground the section passes on to its content: true for a dark one, false for a
   * light one. Without it, a section with a "backgroundColor" passes on the ground that colour
   * makes, and one without passes on the ground it sits on itself. Set it where the section
   * carries a "backgroundImage": whether an image is dark or light cannot be derived from it, so
   * the call site says so. It wins over the ground of the colour whenever it is set. */
  readonly darkTheme?: boolean;
  /** Optionally, the ID of the tab a tab bar switches this section with (see the prop "id" of the
   * tab items of "TabBar"). It writes two ARIA attributes at once: the section's role becomes
   * "tabpanel", and "aria-labelledby" names that tab, so that a screen reader reading the section
   * says which tab it belongs to. The tab states the other direction through its prop "panelId",
   * which takes this section's own "id" - one of the two without the other leaves the pair half
   * spoken. A section that is a panel is announced as one even where the callback prop "onClick"
   * would otherwise make it a button. */
  readonly tabBarItemId?: string;
  /** Setting this prop to true displays a vertical scroll bar when the content of the section
   * exceeds the available space. If, on the other hand, a numerical value in pixels is given,
   * scrolling occurs at a fixed increment. */
  readonly scrollBarV?: boolean | number;
  /** Setting this prop to true displays a horizontal scroll bar when the content of the section
   * exceeds the available space. If, on the other hand, a numerical value in pixels is given,
   * scrolling occurs at a fixed increment. */
  readonly scrollBarH?: boolean | number;
  /** If scroll bars are used (see props "scrollBarV" and "scrollBarH") and this prop is set to
   * true, then the section can also be scrolled using the arrow keys, the page up and page down
   * keys, and the Home and End keys. */
  readonly enableScrollingKeys?: boolean;
  /** The content (sub-components) of the section. This can also be a function ("Function as Child
   * Component"), which is called by the section during rendering and can return sub-components.
   * This function receives an object with the two fields width and height as an argument. The
   * values correspond to the width and height of the section including padding and without border
   * (clientWidth and clientHeight). If the dimensions of the section change, the function is called
   * again. The use of such a function can look like this:
   * @example
   * ```typescript
   * <Section>
   *   {({ width, height }) => {
   *     // do something...
   *
   *     return (
   *       <MyComponent width={width} />
   *     );
   *   }}
   * </Section>
   * ``` */
  readonly children?: React.ReactNode | (({ width, height }: { width: number; height: number }) => React.ReactNode);
}

/**
 * The click of a section, which it ties to a ground of its own: a clickable section is drawn like
 * the filled button, and its pane needs a body - a "backgroundColor" or a "backgroundImage".
 */
export type SectionClickProps = ({
  /** An optional callback function that is called when the section is clicked. The section then
   * takes the role "button", is reachable by the tab key and fires on Enter and space as well. It
   * is drawn and behaves like the filled button: it carries the button's full pane whether
   * "boxShadow" is set or not, and under the pointer, the focus and a press it answers as the
   * button does. It therefore needs a "backgroundColor" or a "backgroundImage", which the types
   * require.
   *
   * A clickable section holds no controls. An element with the role "button" makes its children
   * presentational, so a control inside it would be out of a screen reader's reach; text, icons and
   * indicators are what it holds. */
  readonly onClick: ({ event }: { event: SectionClickEvent }) => void;
} & (
  { readonly backgroundColor: ColorKeys }
  | { readonly backgroundImage: NonNullable<StylingPropCollection['backgroundImage']> }
)) | { readonly onClick?: never };

/** The props of the React component of the layout component "Section". */
export type SectionProps = SectionBaseProps & SectionClickProps;
