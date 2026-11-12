import type { TabBarItemBaseProps } from '../tabBar.types';


/** The props of the React sub-component "TabBarTitleItem" of the control component "TabBar". */
export interface TabBarTitleItemProps extends TabBarItemBaseProps {
  /** The title of the tab, shown in upper case. Default value: an empty string. */
  readonly title?: string | number;
  /** An optional subtitle below the title, in the hint lettering. Default value: an empty string,
   * which shows no subtitle. */
  readonly subTitle?: string | number;
}
