import type { configureReduxStore } from './store';


export enum SliceStatus {
  PENDING = 'PENDING',
  INIT = 'INIT',
  LOADING = 'LOADING',
  READY = 'READY',
  ERROR = 'ERROR',
}


export interface LogEntry {
  slice: string;
  level: 'info' | 'warning' | 'error';
  timestamp: number;
  title?: string;
  text: string;
}


export interface LazyLoadedSlices {} // eslint-disable-line @typescript-eslint/no-empty-object-type

export type RootStore = ReturnType<typeof configureReduxStore>;

export type RootState = ReturnType<(ReturnType<typeof configureReduxStore>)['getState']>;

export type RootDispatch = (ReturnType<typeof configureReduxStore>)['dispatch'];
