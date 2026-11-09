import type { StylingPropCollection } from 'components/hooks/useStylingProps';

import type { TitleProps } from './title/title.types';
import type { ToggleButtonProps } from './toggleButton/toggleButton.types';


export const toolbarStylingProps = [
  'gridArea',
  'placeSelf',
  'alignSelf',
  'justifySelf',
  'alignContent',
  'alignItems',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
  'backgroundColor',
] as const;

export type ToolbarStylingProps = Pick<StylingPropCollection, (typeof toolbarStylingProps)[number]>;


export interface ToolbarHandle {
  clientLeft: Element['clientLeft'] | undefined;
  clientWidth: Element['clientWidth'] | undefined;
  clientTop: Element['clientTop'] | undefined;
  clientHeight: Element['clientHeight'] | undefined;
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
  contains: (other: Node | null) => ReturnType<Element['contains']> | undefined;
}


/** The props of the React component of the layout component "Toolbar". */
export type ToolbarProps = React.PropsWithChildren<{
  /** The React reference of an imperative handle of the toolbar component. */
  readonly ref?: React.Ref<ToolbarHandle | null>;
  /** Optionally, an ID for the HTML attribute "id" of the toolbar, written in every build - for
   * example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** Optionally, the ID of the tab a tab bar switches this toolbar with (see the prop "id" of the
   * tab items of "TabBar"). It writes two ARIA attributes at once: the toolbar's role becomes
   * "tabpanel", and "aria-labelledby" names that tab, so that a screen reader reading the toolbar
   * says which tab it belongs to. The tab states the other direction through its prop "panelId",
   * which takes this toolbar's own "id" - one of the two without the other leaves the pair half
   * spoken. */
  readonly tabBarItemId?: string;
  /** If this prop is set to true, the toolbar will have a closing horizontal line. */
  readonly withLine?: boolean;
  /** The title text as it should appear in the toolbar. */
  readonly title?: TitleProps['title'];
  /** This prop defines the type of the title text (see Prop "title"): you can choose between
   * "headline" (default), "title" and "label". */
  readonly titleType?: TitleProps['titleType'];
  /** A supplementary subtitle that is displayed behind the actual title (see Prop "title"). Please
   * note that this subtitle is only displayed if a title has also been specified. BBCodes can be
   * used in this prop. */
  readonly subTitle?: TitleProps['subTitle'];
  /** Setting this prop to true centers the title and subtitle within the toolbar. Any containers of
   * type <ToolbarContrItem> that may have been inserted remain unaffected; they are always placed
   * at the end of the toolbar. */
  readonly centerTitle?: TitleProps['centerTitle'];
  /** If you want a button to appear at the beginning of the toolbar that allows you to show and
   * hide the following content, this prop must be set to a Boolean value. False means that the
   * content is visible and true means that it is currently hidden. */
  readonly hideFollowing?: boolean;
  /** This prop can be used to disable the button for showing and hiding the following content. */
  readonly disableToggleButton?: boolean;
  /** This callback prop is called when the button for showing and hiding the following content is
   * clicked (see Prop "hideFollowing"). */
  readonly onToggleFollowing?: ({ event }: { event: Parameters<ToggleButtonProps['onClick']>[0] }) => void;
} & ToolbarStylingProps>;
