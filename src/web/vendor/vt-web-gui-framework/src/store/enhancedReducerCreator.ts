import {
  createNextState, type Reducer, type Slice, type UnknownAction,
} from '@reduxjs/toolkit';


/**
 * Helper function to enhance the reducer of a given slice. A new reducer is returned, that has an
 * additional config element in the action object (see store/index.ts). If this reducer is called by
 * the store and if its state is undefined (at slice initialization), an initial state is created by
 * the given function "createInitialState". This function gets as first argument a mutable draft
 * state of the original initial state of the slice and as second argument the config element.
 * Finally the original reducer of the slice is called with this new state and with the action of
 * returned reducer. Note that the config element has been removed from the action so it can't be
 * used by the reducer functions of the slice.
 */
export const enhancedReducerCreator = <S>(
  slice: Slice<S>,
  createInitialState?: (draftState: S, config: Element) => void,
): Reducer<S, UnknownAction & { config?: Element }> => (
  (state: S | undefined, { config, ...action }: UnknownAction & { config?: Element }) => {
    const enhancedState = (!state && createInitialState && config)
      ? createNextState(slice.getInitialState(), (draftState: S) => {
        createInitialState(draftState, config);
      })
      : state;

    return slice.reducer(enhancedState, action);
  }
);
