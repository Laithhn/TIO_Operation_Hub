import { configureStore } from '@reduxjs/toolkit';

import { listenerMiddleware } from './listenerMiddleware';
import { rootReducer } from './rootReducer';
import type { RootStore } from './store.types';


let createdStore: unknown;


export const configureReduxStore = (config: Element) => {
  if (createdStore) {
    throw new Error('VIWGF/Store > configureReduxStore: the store has already been configured, this can only be done once.');
  }

  const store = configureStore({
    // The action of the root reducer is extended by the given configuration (field "config").
    reducer: (state: Parameters<typeof rootReducer>[0], action) => rootReducer(state, { ...action, config }),

    middleware: (getDefaultMiddleware) => (
      getDefaultMiddleware({
        immutableCheck: {
          warnAfter: 200,
        },
        serializableCheck: {
          warnAfter: 200,
        },
      }).prepend(listenerMiddleware.middleware)
    ),

    devTools: (process.env['NODE_ENV'] === 'development'),
  });

  createdStore = store;

  return store;
};


/**
 * Function to return the store, if it is configured with function configureStore() before. If not,
 * an exception is thrown. You can use this function, to use the store in plain JavaScript
 * functions. For the use in React components, please use useSelector() and useDispatch() from
 * react-redux.
 */
export const getStore = (): RootStore => {
  if (!createdStore) {
    throw new Error('VIWGF/Store > getStore: the store has not yet been configured, this must be done with configureStore().');
  }

  return createdStore as RootStore;
};
