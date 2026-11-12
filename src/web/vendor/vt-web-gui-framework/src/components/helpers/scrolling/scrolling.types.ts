import type { ColorKeys } from 'assets/styles';


export interface ScrollingHandle {
  clientLeft: Element['clientLeft'] | undefined;
  clientWidth: Element['clientWidth'] | undefined;
  clientTop: Element['clientTop'] | undefined;
  clientHeight: Element['clientHeight'] | undefined;
  scrollLeft: Element['scrollLeft'] | undefined;
  scrollLeftPercentage: number | undefined;
  scrollWidth: Element['scrollWidth'] | undefined;
  scrollTop: Element['scrollTop'] | undefined;
  scrollTopPercentage: number | undefined;
  scrollHeight: Element['scrollHeight'] | undefined;
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
  contains: (other: Node | null) => ReturnType<Element['contains']> | undefined;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollVertically: (diff: number) => void;
  scrollToLeft: () => void;
  scrollToRight: () => void;
  scrollHorizontally: (diff: number) => void;
}


/** The props of the React component of the helper component "Scrolling". */
export type ScrollingProps = React.PropsWithChildren<{
  /** The React reference of an imperative handle of the scrolling component. */
  readonly ref?: React.Ref<ScrollingHandle | null>;
  /** Optionally, an ID can be passed to the scrolling component. It is written to the HTML
   * attribute "id" of the wrapper in every build, and it is the key the scroll position is stored
   * under (see the prop "restoreLastPosition") - one name for the instance, used for both. As an
   * HTML ID it has to be unique in the whole document, and IDs starting with "viwgf_" are reserved
   * for the framework. */
  readonly id?: string;
  /** Optionally, the ID of the tab a tab bar switches this content with (see the prop "id" of the
   * tab items of "TabBar"). It writes two ARIA attributes on the wrapper at once: the role becomes
   * "tabpanel", and "aria-labelledby" names that tab. The layout components hand their own prop of
   * that name down here whenever they scroll, because their ID sits on the wrapper then and the
   * two attributes have to describe the element that ID names. */
  readonly tabBarItemId?: string;
  /** This prop can be used to pass the name of one or more CSS classes to the component. These are
   * then assigned to the wrapper, the outer HTML element of the scrolling component. Please note
   * that the wrapper must retain relative or absolute positioning. All other CSS properties can be
   * set as desired. */
  readonly className?: string;
  /** This prop can be passed an object containing CSS styling properties. These are then assigned
   * as inline styles to the wrapper, the outer HTML element of the scrolling component. Please note
   * that the wrapper must retain relative or absolute positioning. All other properties can be set
   * as desired. */
  readonly style?: React.CSSProperties;
  /** To enable scrolling in the vertical (Y) direction, this prop must be set to true.
   * Alternatively, a number can be passed as a pixel value, which causes scrolling to occur at a
   * fixed increment. */
  readonly vertical?: boolean | number;
  /** To enable scrolling in the horizontal (X) direction, this prop must be set to true.
   * Alternatively, a number can be passed as a pixel value, which causes scrolling to occur at a
   * fixed increment. */
  readonly horizontal?: boolean | number;
  /** By setting this prop to true, you can also scroll using the keyboard. To do this, the keydown
   * event is applied to the window element with the following keys: ArrowUp, ArrowDown, PageUp, and
   * PageDown for vertical scrolling, ArrowLeft and ArrowRight for horizontal scrolling, and Home
   * and End for both vertical and horizontal scrolling. */
  readonly enableKeys?: boolean;
  /** If vertical srolling is enabled (see prop "vertical") and this prop is set to true, an icon is
   * shown to scroll back to the top fo the scrolling area. */
  readonly showBackToTopButton?: boolean;
  /** If this prop is assigned a color, the corresponding sides of the scrollable area are shaded
   * when scrolling. */
  readonly shaderColor?: ColorKeys | (string & {});
  /** If this prop is set to true and an ID (see prop "id") has been specified, the set scroll
   * position is saved for the remainder of the session when the scrolling component is removed. If
   * the scrolling component with the same ID is then remounted, the page will automatically scroll
   * to this position. */
  readonly restoreLastPosition?: boolean;
  readonly scrollToAnchor?: string;
  /** This optional callback prop is called when the scroll position changes. An object with the
   * fields "top" and "left" is passed, whose numerical values describe the current scroll position.
   * Its identity counts: a new one makes the component report the current scroll position once
   * more. */
  readonly onScroll?: ({ top, left }: { top: number; left: number }) => void;
}>;
