import {
  addListener as addReduxListener, createListenerMiddleware, type ListenerEffect, type UnknownAction,
} from '@reduxjs/toolkit';

import type { RootDispatch, RootState } from './store.types';


// Create the instance of the one and only listener middleware of the entire store. If you want to
// use listener middleware in your slice, import and use the methods startListening, stopListening
// and clearListeners of this instance into your slice, and startInitialListener below for a
// listener that initializes your slice once.
// To dynamically add and remove listeners, e.g. in a React hook, import action creator addListener
// from here, while you have to import the other action creators removeListener and
// clearAllListeners from package @reduxjs/toolkit directly.
export const listenerMiddleware = createListenerMiddleware();

export const startListening = listenerMiddleware.startListening.withTypes<RootState, RootDispatch>();
export const { stopListening, clearListeners } = listenerMiddleware;
export const addListener = addReduxListener.withTypes<RootState, RootDispatch>();


/**
 * Function to start a listener whose effect runs exactly once, with the first action dispatched
 * after this call. A slice uses it to initialize itself as soon as the store dispatches anything,
 * e.g. to create its storage connections or to register its listeners at an interface.
 *
 * Unsubscribing in the effect alone would not keep such a listener from running twice: the
 * listener middleware runs the listeners of an action from a copy of its list, taken before the
 * first of them runs (Redux Toolkit 2.12.0). If a listener earlier in that copy dispatches
 * synchronously, this one runs for the nested action and unsubscribes there, while the outer action
 * still runs it from its copy. The flag checked by the predicate is what keeps it to one run.
 */
export const startInitialListener = ({ effect }: { effect: ListenerEffect<UnknownAction, RootState, RootDispatch> }) => {
  let hasRun = false;

  const unsubscribe = startListening({
    predicate: () => !hasRun,
    effect: (action, listenerApi) => {
      hasRun = true;
      unsubscribe();

      return effect(action, listenerApi);
    },
  });
};
