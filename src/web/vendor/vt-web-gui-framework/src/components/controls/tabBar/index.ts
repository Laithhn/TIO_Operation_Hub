import { TabBar } from './TabBar';
import type {
  TabBarHandle, TabBarItemClickEvent, TabBarItemHandle, TabBarItemId, TabBarPos, TabBarProps,
} from './tabBar.types';
import { TabBarContrItem } from './tabBarContrItem/TabBarContrItem';
import type { TabBarContrItemProps } from './tabBarContrItem/tabBarContrItem.types';
import { TabBarTitleItem } from './tabBarTitleItem/TabBarTitleItem';
import type { TabBarTitleItemProps } from './tabBarTitleItem/tabBarTitleItem.types';


export type {
  TabBarContrItemProps, TabBarHandle, TabBarItemClickEvent, TabBarItemHandle, TabBarItemId,
  TabBarPos, TabBarProps, TabBarTitleItemProps,
};

export { TabBar, TabBarContrItem, TabBarTitleItem };
