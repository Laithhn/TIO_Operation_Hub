import type { ColorKeys, Ground, SpaceKeys } from 'assets/styles';


export interface StylingPropCollection {
  /** If set to true, it results in CSS property "position" with value "relative". For inner
   * style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position */
  relativePosition?: boolean;
  /** Lets the component stick to one edge of the scroll area it lies in: it travels with the
   * content until that edge is reached, stays there while the rest scrolls past, and leaves again
   * when the corresponding edge of its parent arrives - so a sticky element never reaches beyond
   * the element it sits in. The value names the edge, and for a vertically scrolling area that is
   * "top". It results in the CSS property "position" with value "sticky" and an inset of 0 on that
   * edge; "left" and "right" are mirrored for a right-to-left language. It also sets the lowest
   * "z-index", without which content further down the page would pass over the sticky element
   * instead of under it wherever that content is positioned or opens a stacking context. That
   * z-index ranks the element within its content only, so it never lies over a modal window or a
   * notification.
   * The prop only does something inside a scroll area, and it is not meant to be combined with the
   * props "scrollBarV" and "scrollBarH" on the same element - a scroll area inside a scroll area is
   * nothing a layout should ask of a reader. For outer style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position */
  stickyPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Corresponds to the CSS property "direction" and is used to enforce the reading and writing
   * direction. If not set, the direction is based on the direction of the currently set language.
   * Typical values are "rtl" for a right-to-left setting and "ltr" for a left-to-right setting. For
   * inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/direction */
  direction?: React.CSSProperties['direction'];
  /** Corresponds to the CSS grid property "grid-area" and is used to place the component within a
   * layout element such as <Section>. This prop can be passed the name of an area that was defined
   * in the parent component, e.g., using the prop "gridTemplateAreas". Alternatively, this prop can
   * also be passed the 1-based numbers or the names of the grid lines between which the component
   * should be located, e.g.: "grid-row-start / grid-column-start / grid-row-end / grid-column-end".
   * For outer style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/grid-area */
  gridArea?: React.CSSProperties['gridArea'];
  /** Corresponds to the CSS grid property "place-self" and is used for both vertical and horizontal
   * alignment of the component within a layout element such as <Section> (one value for both
   * directions). If the "alignSelf" or "justifySelf" props are used in addition to this prop, their
   * values are also set as inline styles. In doing so, they override the corresponding part of
   * "place-self" in the CSS. An alignment made with "placeSelf" can usually also be achieved in the
   * parent container with the "placeItems" prop. For outer style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/place-self */
  placeSelf?: React.CSSProperties['placeSelf'];
  /** Corresponds to the CSS grid property "align-self" and is used for vertical alignment of the
   * component within a layout element such as <Section>. Alignment performed with "alignSelf" can
   * usually also be achieved in the parent container with the "alignItems" prop. For outer
   * style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/align-self */
  alignSelf?: React.CSSProperties['alignSelf'];
  /** Corresponds to the CSS grid property "justify-self" and is used for horizontal alignment of
   * the component within a layout element such as <Section>. Alignment using "justifySelf" can
   * usually also be achieved in the parent container using the "justifyItems" prop. For outer
   * style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/justify-self */
  justifySelf?: React.CSSProperties['justifySelf'];
  /** Caps the width of the component at a measure the framework defines; a width of one's own
   * cannot be set. The one measure so far is "textColumn", for a column of running text: no wider
   * than the reading measure of 65ch in the component's font, about 70 characters per line. A
   * shorter text keeps the component as narrow as it needs to be. Corresponds to the CSS property
   * "max-width". For outer style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/max-width */
  maxWidth?: 'textColumn';
  /** If set to false, it results in CSS property "visibility" with value "hidden". For outer
   * style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/visibility */
  visible?: boolean;
  /** Corresponds to the CSS grid property "grid-template-rows" and specifies the number and sizes
   * of rows in which sub-elements can be placed for a layout element such as <Section>. For inner
   * style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/grid-template-rows */
  gridTemplateRows?: React.CSSProperties['gridTemplateRows'];
  /** Corresponds to the CSS grid property "grid-template-columns" and specifies the number and
   * sizes of columns in which sub-elements can be placed for a layout element such as <Section>.
   * For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/grid-template-columns */
  gridTemplateColumns?: React.CSSProperties['gridTemplateColumns'];
  /** Corresponds to the CSS grid property "grid-template-areas" and defines the structure and
   * position of the sub-elements by specifying the names of the grid areas. Repeating these names
   * causes the content to span the respective cells. Specifying a dot means an empty cell. Lines
   * must be grouped with double quotation marks and separated from each other with spaces. For
   * inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/grid-template-areas */
  gridTemplateAreas?: React.CSSProperties['gridTemplateAreas'];
  /** Corresponds to the CSS grid property "grid-auto-flow" and determines how automatically placed
   * content is arranged in the grid. "row" instructs the auto-placement algorithm to fill each row
   * sequentially and add new rows as needed. "column" instructs the auto-placement algorithm to
   * fill each column sequentially and add new columns as needed. The values "dense", "row dense",
   * and "column dense" cause holes in the grid created by automatic filling to be filled by smaller
   * elements that appear later. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/grid-auto-flow */
  gridAutoFlow?: React.CSSProperties['gridAutoFlow'];
  /** Corresponds to the CSS grid property "grid-auto-rows" and specifies the height of
   * automatically added rows. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/grid-auto-rows */
  gridAutoRows?: React.CSSProperties['gridAutoRows'];
  /** Corresponds to the CSS grid property "grid-auto-columns" and specifies the width of
   * automatically added columns. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/grid-auto-columns */
  gridAutoColumns?: React.CSSProperties['gridAutoColumns'];
  /** This prop corresponds to the CSS grid property "gap". It is used to define the spacing between
   * both the rows and columns of the grid (one value for both). If the props "rowGap" or
   * "columnGap" are set in addition to this prop, their values are also set as inline styles. In
   * doing so, they override the corresponding part of "gap" in the CSS. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/gap */
  gap?: SpaceKeys;
  /** This prop corresponds to the CSS grid property "row-gap" and defines the spacing between the
   * rows of the grid. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/row-gap */
  rowGap?: SpaceKeys;
  /** This prop corresponds to the CSS grid property "column-gap" and defines the spacing between
   * the columns of the grid. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/column-gap */
  columnGap?: SpaceKeys;
  /** Corresponds to the CSS grid property "place-content" and is used for both vertical and
   * horizontal alignment of the entire grid (one value for both directions). If the props
   * "alignContent" or "justifyContent" are used in addition to this prop, their values are also set
   * as inline styles. In doing so, they override the corresponding part of "place-content" in the
   * CSS. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/place-content */
  placeContent?: React.CSSProperties['placeContent'];
  /** Corresponds to the CSS grid property "align-content" and is used for the vertical alignment of
   * the entire grid. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/align-content */
  alignContent?: React.CSSProperties['alignContent'];
  /** Corresponds to the CSS grid property "justify-content" and is used for horizontal alignment of
   * the entire grid. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/justify-content */
  justifyContent?: React.CSSProperties['justifyContent'];
  /** Corresponds to the CSS grid property "place-items" and is used for both vertical and
   * horizontal alignment of the subelements within the specified grid (one value for both
   * directions). If the props "alignItems" or "justifyItems" are used in addition to this prop,
   * their values are also set as inline styles. In doing so, they override the corresponding part
   * of "place-items" in the CSS. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/place-items */
  placeItems?: React.CSSProperties['placeItems'];
  /** Corresponds to the CSS grid property "align-items" and is used for vertical alignment of
   *  subelements within the specified grid. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/align-items */
  alignItems?: React.CSSProperties['alignItems'];
  /** Corresponds to the CSS grid property "justify-items" and is used for horizontal alignment of
   * subelements within the specified grid. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/justify-items */
  justifyItems?: React.CSSProperties['justifyItems'];
  /** This prop defines the inner spacing of the component (one value for all four sides) and
   * corresponds to the CSS property "padding". The value passed is always combined with the values
   * of other padding props to form a CSS "padding" property, which is then set as an inline style.
   * If the props "markerTop", "markerRight", "markerBottom", or "markerLeft" are also set, their
   * respective widths are subtracted from the inner spacing. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/padding */
  padding?: SpaceKeys;
  /** This prop defines the upper inner spacing of the component and corresponds to the CSS property
   * "padding-top". The value passed is always combined with the values of other padding props to
   * form a CSS property "padding", which is then set as an inline style. If the prop "markerTop" is
   * also set, its respective width is subtracted from the inner spacing. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/padding-top */
  paddingTop?: SpaceKeys;
  /** This prop defines the right inner margin of the component and corresponds to the CSS property
   * "padding-right". The value passed is always combined with the values of other padding props
   * to form a CSS property "padding", which is then set as an inline style. If the prop
   * "markerRight" is also set, its respective width is subtracted from the inner margin. For inner
   * style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/padding-right */
  paddingRight?: SpaceKeys;
  /** This prop defines the lower inner spacing of the component and corresponds to the CSS property
   * "padding-bottom". The value passed is always combined with the values of other padding props
   * to form a CSS property "padding", which is then set as an inline style. If the prop
   * "markerBottom" is also set, its respective width is subtracted from the inner spacing. For
   * inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/padding-bottom */
  paddingBottom?: SpaceKeys;
  /** This prop defines the left inner spacing of the component and corresponds to the CSS property
   * "padding-left". The value passed is always combined with the values of other padding props to
   * form a CSS property "padding", which is then set as an inline style. If the prop "markerLeft"
   * is also set, its respective width is subtracted from the inner spacing. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/padding-left */
  paddingLeft?: SpaceKeys;
  /** This prop allows the upper edge of the component to be displayed in color and results in the
   * CSS property "border-top". The width of the marker is subtracted from any inner spacing that
   * may have been set (see props "padding" and "paddingTop"). Results in a colored border, for
   * outer style. */
  markerTop?: ColorKeys;
  /** This prop allows the right edge of the component to be displayed in color and results in the
   * CSS properties "border-right". The width of the marker is subtracted from any inner spacing
   * that may have been set (see props "padding" and "paddingRight"). Results in a colored border,
   * for outer style. */
  markerRight?: ColorKeys;
  /** This prop allows the bottom edge of the component to be displayed in color and results in the
   * CSS properties "border-bottom". The width of the marker is subtracted from any inner spacing
   * that may have been set (see props "padding" and "paddingBottom"). Results in a colored border,
   * for outer style. */
  markerBottom?: ColorKeys;
  /** This prop allows the left edge of the component to be displayed in color and results in the
   * CSS properties "border-left". The width of the marker is subtracted from any inner spacing that
   * may have been set (see props "padding" and "paddingLeft"). Results in a colored border, for
   * outer style. */
  markerLeft?: ColorKeys;
  /** This prop rounds the corners of the component (one value for all four edges) and corresponds
   * to the CSS property with the same name. The value passed is always combined with the values of
   * other border radius props to form a CSS property "border-radius", which is then set as an
   * inline style. For outer style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/border-radius */
  borderRadius?: SpaceKeys;
  /** This prop rounds the top-left corner of the component and corresponds to the CSS property with
   * the same name. The value passed is always combined with the values of other border radius props
   * to form a CSS property "border-radius", which is then set as an inline style. For outer style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/border-top-left-radius */
  borderTopLeftRadius?: SpaceKeys;
  /** This prop rounds the top-right corner of the component and corresponds to the CSS property
   * with the same name. The value passed is always combined with the values of other border radius
   * props to form a CSS property "border-radius", which is then set as an inline style. For outer
   * style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/border-top-right-radius */
  borderTopRightRadius?: SpaceKeys;
  /** This prop rounds the bottom-right corner of the component and corresponds to the CSS property
   * with the same name. The value passed is always combined with the values of other border radius
   * props to form a CSS property "border-radius", which is then set as an inline style. For outer
   * style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/border-bottom-right-radius */
  borderBottomRightRadius?: SpaceKeys;
  /** This prop rounds the bottom-left corner of the component and corresponds to the CSS property
   * with the same name. The value passed is always combined with the values of other border radius
   * props to form a CSS property "border-radius", which is then set as an inline style. For outer
   * style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/border-bottom-left-radius */
  borderBottomLeftRadius?: SpaceKeys;
  /** This prop can be used to assign a defined background color to the component. It results in an
   * inline style in the CSS property "background". The background color can be combined with the
   * props "backgroundImage" and "backgroundOptions". For outer style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/background
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/background-color */
  backgroundColor?: ColorKeys;
  /** This prop can be passed a string with a background image like "url(...)" or a color gradient,
   * as defined for the CSS property "background-image". The prop results in an inline style in the
   * CSS property "background" and can also be combined with a background color (see prop
   * "backgroundColor") and other options (see prop "backgroundOptions") if necessary. For outer
   * style.
   * An image states no ground: whether it is dark or light cannot be derived from it. A component
   * that offers the prop "darkTheme" takes the ground from there; without it, the component passes
   * on the ground it sits on, or the one of its background colour.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/background-image */
  backgroundImage?: React.CSSProperties['backgroundImage'];
  /** This prop can be used if the Prop backgroundImage is also set. Its value is appended to the
   * CSS property "background" and can contain CSS specifications for the position, size, alignment,
   * etc. of the image. For outer style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/background
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/background-origin
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/background-position
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/background-repeat
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/background-size */
  backgroundOptions?: string;
  /** Optionally, the pane of a component placed on a surface: a 1px edge, the contact shadow of a
   * body lying on the surface, and the lit rim and inner glow that make it read as glass - the
   * tinted pane of the controls, drawn for the ground the component sits on. Whether a component
   * casts it is the content's choice for reasons of design; a section serving as an invisible grid
   * container casts none. The component draws it through a class of its own on the outer element,
   * not as an inline style. */
  boxShadow?: 'contact';
  /** Corresponds to the CSS property "object-fit" and is used to adjust media elements such as
   * images or videos to the height and width of the container used. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/object-fit */
  objectFit?: React.CSSProperties['objectFit'];
  /** Corresponds to the CSS property "object-position" and is used to position media elements such
   * as images or videos within their component. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/object-position */
  objectPosition?: React.CSSProperties['objectPosition'];
  /** Corresponds to the CSS property "text-align" and is used to align text horizontally. Using
   * this property makes sense when text wraps, since, for example, the prop "justifySelf" would
   * only align the text field as a whole. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-align */
  textAlign?: React.CSSProperties['textAlign'];
  /** Corresponds to the CSS property "white-space" and sets how white spaces inside the element are
   * handled. For inner style.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/white-space */
  whiteSpace?: React.CSSProperties['whiteSpace'];
  /** If this prop is set to true, hidden overflow text content is signaled to the user by
   * displaying an ellipsis (...). For this, the CSS properties "text-overflow" is set to "ellipsis"
   * and "overflow" is set to "hidden". If styling prop "whiteSpace" (see above) is not set, the CSS
   * property "white-space" is automatically set to "nowrap". For inner style. */
  textOverflowEllipsis?: boolean;
  /** If this prop is set to true, content that extends beyond the corresponding component will be
   * cut off, which corresponds to the CSS property "overflow" with value "hidden". For inner style,
   * default value: false.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow */
  overflowHidden?: boolean;
}


export type StylingPropKeys = (keyof StylingPropCollection)[];


/** CSS inline styles that may carry the ground a painted background sets: the inherited custom
 * property "--ground" (see assets/styles/ground). */
export type GroundStyle = React.CSSProperties & { '--ground'?: Ground };

/** The returned value of the React hook "useStylingProps". */
export interface UseStylingPropsResult {
  /** Object with CSS inline styles for the inner element. */
  innerElemStyle: React.CSSProperties;
  /** Object with CSS inline styles for the outer element, which carries the background and with
   * it the ground that background sets. */
  outerElemStyle: GroundStyle;
  /** Optionally an object with all CSS inline styles (inner and outer elements combined). */
  elemStyle?: GroundStyle;
  /** Object with the resulting numerical padding values. */
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** True, if the component's own ground is dark: its background colour makes a dark ground, or
   * the option "darkTheme" says so. The ground it sits on is another matter, which only CSS
   * knows. */
  hasDarkBackground: boolean;
}
