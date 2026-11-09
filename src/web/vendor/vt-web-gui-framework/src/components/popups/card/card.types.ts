import { type ScrollingHandle } from 'components/helpers/scrolling';
import type { StylingPropCollection } from 'components/hooks/useStylingProps';


export const cardStylingProps = [
  'gridTemplateRows',
  'gridTemplateColumns',
  'gridTemplateAreas',
  'gridAutoFlow',
  'gridAutoRows',
  'gridAutoColumns',
  'gap',
  'rowGap',
  'columnGap',
  'placeItems',
  'alignItems',
  'justifyItems',
  'placeContent',
  'alignContent',
  'justifyContent',
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
  'textAlign',
] as const;

export type CardStylingProps = Pick<StylingPropCollection, (typeof cardStylingProps)[number]>;


export type CardHandle = {
  clientLeft: Element['clientLeft'] | undefined;
  clientWidth: Element['clientWidth'] | undefined;
  clientTop: Element['clientTop'] | undefined;
  clientHeight: Element['clientHeight'] | undefined;
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
  contains: (other: Node | null) => ReturnType<Element['contains']> | undefined;
} & Partial<ScrollingHandle>;


/** The element a card can be positioned on, see prop "anchorElemRef" of CardProps. Only
 * "getBoundingClientRect" is read from it, so besides an HTML element this is satisfied by the
 * imperative handle of a component exposing that method, e.g. a ButtonHandle. */
export interface CardAnchorElem {
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
}


/** The props of the React component of the popup component "Card". */
export type CardProps = React.PropsWithChildren<{
  /** The React reference of an imperative handle of the card component. */
  readonly ref?: React.Ref<CardHandle | null>;
  /** Optionally, an ID for the HTML attribute "id" of the card, written in every build - for
   * example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** This prop can be used to control the animated fade-in and fade-out of the card, e.g., via the
   * useFadeInOut hook. If the prop is not set, the card will fade in and out without animation
   * while mounting and unmounting. */
  readonly show?: boolean;
  /** Prop for specifying the left position (fixed point) of the card in relation to the left edge
   * of the viewport. The prop is only taken into account if the value is greater than or equal to
   * 0. If a value less than 0 is specified, this is the minimum distance to the left edge of the
   * viewport. If the string "center" is specified as the value, the card is placed horizontally in
   * the center of the viewport. */
  readonly left?: number | 'center';
  /** Prop for specifying the right position (fixed point) of the card in relation to the right edge
   * of the viewport. The prop is only taken into account if the value is greater than or equal to
   * 0. Please note that if the props "left", "right", and "width" are specified simultaneously, the
   * prop "right" has no effect in accordance with CSS rules. If a value less than 0 is specified,
   * this is the minimum distance to the right edge of the viewport. */
  readonly right?: number;
  /** Prop for specifying the width of the card. The prop is only taken into account if the value is
   * greater than or equal to 0. */
  readonly width?: number;
  /** Prop for specifying the upper position (fixed point) of the card in relation to the upper edge
   * of the viewport. The prop is only taken into account if the value is greater than or equal to
   * 0. If a value less than 0 is specified, this is the minimum distance to the upper edge of the
   * viewport. If the string "center" is specified as the value, the card is placed vertically in
   * the center of the viewport. */
  readonly top?: number | 'center';
  /** Prop for specifying the bottom position (fixed point) of the card in relation to the bottom
   * edge of the viewport. The prop is only taken into account if the value is greater than or equal
   * to 0. Please note that if the props "top", "bottom", and "height2 are specified simultaneously,
   * the prop "bottom" has no effect in accordance with CSS rules. If a value less than 0 is
   * specified, this is the minimum distance to the bottom edge of the viewport. */
  readonly bottom?: number;
  /** Prop for specifying the height of the card. The prop is only taken into account if the value
   * is greater than or equal to 0. */
  readonly height?: number;
  /** If this prop is set to true, the card is rendered as an absolutely positioned element at the
   * location where it is inserted into the React DOM. If the prop remains false, the card is
   * inserted via a React portal into the temporary area of the DOM, which lies above the rest of
   * the website. */
  readonly insertInPlace?: boolean;
  /** React reference (see React hook useRef) of the element on which the card is to be positioned,
   * see CardAnchorElem for what qualifies as one. It is automatically placed above or below the
   * element, depending on where there is more space to the respective edge of the browser window.
   * The card is aligned either to the right or left of the reference element, depending on where
   * there is more space available. For lateral placement of the card on the reference element, see
   * Porp "placeBesideAnchorElem". Please note that absolute positioning with the props "left"
   * and/or "right" or "top" and/or "bottom" takes priority over placement on a reference element.
   *
   * A card on a reference element also carries a smaller shadow than a free-standing one, which
   * visually ties it to the element it belongs to. This needs no prop of its own: the floating
   * shadows are a scale of height, and a card hanging from its trigger takes the lower of the
   * two. */
  readonly anchorElemRef?: React.RefObject<CardAnchorElem | null>;
  /** If the card is to be positioned on a reference element (see Prop "anchorElemRef") and this
   * prop is set to true, it will automatically be placed to the right or left of the reference
   * element, depending on which side has more space to the respective edge of the browser window.
   * The card will be aligned flush with the top or bottom of the reference element, depending on
   * which side has more space available. */
  readonly placeBesideAnchorElem?: boolean;
  /** This prop affects the positioning of the card when a fixed width or height is specified (see
   * Prop "width" or "height") if the card extends beyond the edge of the browser window. */
  readonly softAnchor?: boolean;
  /** Setting this prop to true displays a vertical scroll bar when the content of the card exceeds
   * the available space. If, on the other hand, a numerical value in pixels is given, scrolling
   * occurs at a fixed increment. */
  readonly scrollBarV?: boolean | number;
  /** Setting this prop to true displays a horizontal scroll bar when the content of the card
   * exceeds the available space. If, on the other hand, a numerical value in pixels is given,
   * scrolling occurs at a fixed increment. */
  readonly scrollBarH?: boolean | number;
  /** An optional callback prop that is called when a click event occurs on the card. */
  readonly onClick?: ({ event }: { event: React.MouseEvent<HTMLDivElement> }) => void;
  /** An optional callback prop that is called when a pointer down event occurs on the card. */
  readonly onPointerDown?: ({ event }: { event: React.PointerEvent<HTMLDivElement> }) => void;
  /** An optional callback prop that is called when a pointer up event occurs on the card. */
  readonly onPointerUp?: ({ event }: { event: React.PointerEvent<HTMLDivElement> }) => void;
  /** An optional callback prop that is called when a key down event occurs on the card. */
  readonly onKeyDown?: ({ event }: { event: React.KeyboardEvent<HTMLDivElement> }) => void;
  /** An optional callback prop that is called when a pointer down event occurs outside the card
   * while it is open. This prop can be used to close the card. The event is intercepted in the
   * window element. */
  readonly onClickBeside?: ({ event }: { event: PointerEvent }) => void;
  /** An optional callback prop that is called when the Escape key is pressed while the card is
   * open. This prop can be used to close the card. The event is intercepted in the window
   * element. */
  readonly onPressEscape?: ({ event }: { event: KeyboardEvent }) => void;
  /** An optional callback prop that is called when the position values of the reference element
   * (see Prop "anchorElemRef") that are relevant for positioning the card or the size of the
   * browser window changes while the card is open. This prop can be used to close the card. */
  readonly onMoveAnchorElem?: ({ isPlacedOutside, event }: { isPlacedOutside: boolean; event: Event | MutationRecord[] | undefined }) => void;
} & CardStylingProps>;
