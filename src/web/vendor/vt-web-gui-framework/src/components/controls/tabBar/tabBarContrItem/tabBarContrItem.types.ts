import type { StylingPropCollection } from 'components/hooks/useStylingProps';

import type { TabBarItemBaseProps } from '../tabBar.types';


export const tabBarContrItemStylingProps = [
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
  'backgroundColor',
] as const;

export type TabBarContrItemStylingProps = Pick<StylingPropCollection, (typeof tabBarContrItemStylingProps)[number]>;


/** The props of the React sub-component "TabBarContrItem" of the control component "TabBar": a tab
 * that is a container of its own, laid out as a grid through its styling props the way a section
 * is, so that any content can be arranged in it. */
export interface TabBarContrItemProps extends TabBarContrItemStylingProps, TabBarItemBaseProps {
  /** The content of the tab. */
  readonly children?: React.ReactNode;
}
