import type { MenuNodeId, MenuNodeOptions } from '../menus.types';

import * as primaryMenuSlice from './primaryMenu.slice';
import type { PrimaryMenuNode, PrimaryMenuState } from './primaryMenu.types';


export type {
  MenuNodeId, MenuNodeOptions, PrimaryMenuNode, PrimaryMenuState,
};

export { primaryMenuSlice };
