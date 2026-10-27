import type { MenuNodeId, MenuNodeOptions } from '../menus.types';

import * as secondaryMenuSlice from './secondaryMenu.slice';
import type { SecondaryMenuNode, SecondaryMenuState } from './secondaryMenu.types';


export type {
  MenuNodeId, MenuNodeOptions, SecondaryMenuNode, SecondaryMenuState,
};

export { secondaryMenuSlice };
