import { type ScrollingHandle } from 'components/helpers/scrolling';
import type { StylingPropCollection } from 'components/hooks/useStylingProps';


export const mainSectionStylingProps = [
  'relativePosition',
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
] as const;

export type MainSectionStylingProps = Pick<StylingPropCollection, (typeof mainSectionStylingProps)[number]>;


export type MainSectionHandle = {
  clientLeft: Element['clientLeft'] | undefined;
  clientWidth: Element['clientWidth'] | undefined;
  clientTop: Element['clientTop'] | undefined;
  clientHeight: Element['clientHeight'] | undefined;
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
  contains: (other: Node | null) => ReturnType<Element['contains']> | undefined;
} & Partial<ScrollingHandle>;


/** The props of the React component of the layout component "MainSection". It takes no ID of its
 * own: a content has exactly one main section, and the content is identified by the ID of the menu
 * node that called it. In the main scope, a main section with a scroll bar carries that ID on its
 * outer element, the one the scrolling wraps it in, where it is the key the scroll position is
 * stored under as well. */
export interface MainSectionProps extends MainSectionStylingProps {
  /** The React reference of an imperative handle of the main section component. */
  readonly ref?: React.Ref<MainSectionHandle | null>;
  /** By default, the main section has a padding that visually separates the content from the first
   * sidebar. Depending on the content, it may make sense to remove this spacing, which can be done
   * by setting this prop to true. */
  readonly noPaddingStart?: boolean;
  /** By default, the main section has a padding that visually separates the content from the second
   * sidebar. Depending on the content, it may make sense to remove this spacing, which can be done
   * by setting this prop to true. */
  readonly noPaddingEnd?: boolean;
  /** By default, the main section has a padding at the top that visually separates the content from
   * the main toolbar. Depending on the content, it may make sense to remove this spacing, which can
   * be done by setting this prop to true. */
  readonly noPaddingTop?: boolean;
  /** By default, the main section has a padding at the bottom that visually separates the content
   * from the footer. Depending on the content, it may make sense to remove this spacing, which can
   * be done by setting this prop to true. */
  readonly noPaddingBottom?: boolean;
  /** Setting this prop to true displays a vertical scroll bar when the content of the main section
   * exceeds the available space. If, on the other hand, a numerical value in pixels is given,
   * scrolling occurs at a fixed increment. */
  readonly scrollBarV?: boolean | number;
  /** Setting this prop to true displays a horizontal scroll bar when the content of the main
   * section exceeds the available space. If, on the other hand, a numerical value in pixels is
   * given, scrolling occurs at a fixed increment. */
  readonly scrollBarH?: boolean | number;
  /** If scroll bars are used (see props "scrollBarV" and "scrollBarH") and this prop is set to
   * true, then the main section can also be scrolled using the arrow keys, the page up and page
   * down keys, and the Home and End keys. */
  readonly enableScrollingKeys?: boolean;
  /** The content (sub-components) of the main section. This can also be a function ("Function as
   * Child Component"), which is called by the section during rendering and can return sub-
   * components. This function receives an object with the two fields width and height as an
   * argument. The values correspond to the width and height of the main section including padding
   * and without border (clientWidth and clientHeight). If the dimensions of the main section
   * change, the function is called again. The use of such a function can look like this:
   * @example
   * ```typescript
   * <MainSection>
   *   {({ width, height }) => {
   *     // do something...
   *
   *     return (
   *       <MyComponent width={width} />
   *     );
   *   }}
   * </MainSection>
   * ``` */
  readonly children?: React.ReactNode | (({ width, height }: { width: number; height: number }) => React.ReactNode);
}
