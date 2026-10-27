import { combineSlices } from '@reduxjs/toolkit';

import * as appSlice from 'app/app.slice';
import * as headerSlice from 'app/modules/header/header.slice';
import * as mainScopeSlice from 'app/modules/mainScope/mainScope.slice';
import * as modwinsSlice from 'app/modules/modwins/modwins.slice';
import * as notificationsSlice from 'app/modules/notifications/notifications.slice';

import { i18nSlice } from './i18n';
import { primaryMenuSlice } from './menus/primaryMenu';
import { secondaryMenuSlice } from './menus/secondaryMenu';
import { navigationSlice } from './navigation';
import { storageSlice } from './storage';
import type { LazyLoadedSlices } from './store.types';


export const rootReducer = combineSlices({
  // common slices
  [i18nSlice.reducerPath]: i18nSlice.reducer,
  [primaryMenuSlice.reducerPath]: primaryMenuSlice.reducer,
  [secondaryMenuSlice.reducerPath]: secondaryMenuSlice.reducer,
  [navigationSlice.reducerPath]: navigationSlice.reducer,
  [storageSlice.reducerPath]: storageSlice.reducer,
  // slices of the app
  [appSlice.reducerPath]: appSlice.reducer,
  [headerSlice.reducerPath]: headerSlice.reducer,
  [mainScopeSlice.reducerPath]: mainScopeSlice.reducer,
  [modwinsSlice.reducerPath]: modwinsSlice.reducer,
  [notificationsSlice.reducerPath]: notificationsSlice.reducer,
}).withLazyLoadedSlices<LazyLoadedSlices>();
