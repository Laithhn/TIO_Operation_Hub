import type { RootStore } from 'store';


export type AddJsFunc = ({ dispatch, getState, subscribe }: Pick<RootStore, 'dispatch' | 'getState' | 'subscribe'>) => void;
