import { createSlice, type PayloadAction, type WithSlice } from '@reduxjs/toolkit';

import { enhancedReducerCreator, type RootState } from 'store';
import { rootReducer } from 'store/rootReducer';
import { convertUnicode } from 'utils/convertUnicode';
import { isNonEmptyStringOrNumber } from 'utils/type';

import type { FirstSidebarState, FirstSidebarStepperStep, StepperStepStatus } from './firstSidebar.types';
import { createInitialState } from './utils/createInitialState';


const initialState: FirstSidebarState = {
  title: '',
  content: {
    path: '',
  },
  stepper: {
    show: false,
    activeId: '',
    steps: {
      byId: {},
      allIds: [],
    },
  },
};


/**
 * Redux Toolkit slice that handles the partial state of the app module "FirstSidebar". Note that
 * the reducer of this slice isn't exported below, but is injected into the root reducer as soon as
 * this slice is used.
 */
const slice = createSlice({
  name: 'VIWGF/firstSidebar',
  reducerPath: 'firstSidebar',
  initialState,

  reducers: {
    /**
     * Reduder to configure the first sidebar.
     */
    configure: (state, { payload: { title, contentPath } }: PayloadAction<{
      /** Optionally the title displayed in the title field of the first sidebar, that can also be a
       * translation key. If not set or an empty string is given, the title is not displayed. */
      title?: string;
      /** Optionally set the content path for the content area of the first sidenbar. */
      contentPath?: string;
    }>) => {
      if (typeof title === 'string') {
        state.title = convertUnicode(title);
      }

      if (typeof contentPath === 'string') {
        state.content.path = contentPath.trim();
      }
    },


    /**
     * Reduder to set the title displayed in the title field of the sidebar, if enabled. A
     * translation key can be set here, as well as Unicode characters like "\&\#160;" or
     * "\&\#x00A0;". If not set or an empty string is given, the title is not displayed.
     */
    setTitle: (state, { payload }: PayloadAction<string | undefined>) => {
      state.title = convertUnicode(payload ?? '');
    },


    /**
     * Reducer to set (or completely overwrite) the data of the stepper of the first sidebar.
     */
    setStepperData: {
      prepare: ({ show = false, activeId, steps = [] }: {
        /** Optionally set to true or false in order to show or hide the stepper. */
        show?: boolean;
        /** Optionally the ID of the active step of the stepper. */
        activeId?: FirstSidebarStepperStep['id'];
        /** Optionally an array of objects of the steps. The objects have the following fields:
         * \{ id, caption, status, selectable \}. Field "id" must be a string or a number and is
         * mandatory. If the caption of the step is not set, "Step n" is taken with n as the step
         * index. "status" is of type SidebarStatus and SidebarStatus.OPEN by default. "selectable" is
         * a boolean fields with false as default value. */
        steps?: (Pick<FirstSidebarStepperStep, 'id'> & Partial<Pick<FirstSidebarStepperStep, 'caption' | 'isSelectable'> & { status: StepperStepStatus }>)[];
      } = {
        show: false,
        steps: [],
      }) => ({
        payload: {
          show,
          ...((typeof activeId !== 'undefined') && { activeId }),
          steps: steps
            .filter((step) => isNonEmptyStringOrNumber(step.id, { withoutInfinite: true }))
            .map((step, idx) => ({
              id: step.id,
              caption: step.caption || `Step ${idx + 1}`,
              status: step.status ?? 'open',
              isSelectable: step.isSelectable ?? false,
            })),
        },
      }),
      reducer: (state, { payload: { show, activeId, steps } }: PayloadAction<{
        show: boolean;
        activeId?: FirstSidebarStepperStep['id'];
        steps: FirstSidebarStepperStep[];
      }>) => {
        state.stepper.show = show;
        state.stepper.steps.allIds = [];

        state.stepper.steps.byId = steps.reduce<FirstSidebarState['stepper']['steps']['byId']>((acc, step) => {
          if (step.id === activeId) {
            state.stepper.activeId = step.id;
          }

          return {
            ...acc,
            [step.id]: step,
          };
        }, {});

        state.stepper.steps.allIds = Object.keys(state.stepper.steps.byId);
      },
    },


    /**
     * Reducer to show the stepper of the first sidebar.
     */
    showStepper: (state) => {
      state.stepper.show = true;
    },


    /**
     * Reducer to hide the stepper of the first sidebar.
     */
    hideStepper: (state) => {
      state.stepper.show = false;
    },


    /**
     * Reducer to set a step of the stepper of the first sidebar as active, if a step with the given
     * ID exists.
     */
    setActiveStep: (state, { payload }: PayloadAction<string | number>) => {
      if (state.stepper.steps.allIds.includes(payload)) {
        state.stepper.activeId = payload;
      }
    },


    /**
     * Reducer to set the status of an existing step of the stepper of the first sidebar.
     */
    setStepStatus: {
      prepare: (id: FirstSidebarStepperStep['id'], { status, isSelectable }: {
        /** Optionally the status of the step. */
        status?: StepperStepStatus;
        /** Optionally set the step as selectable. */
        isSelectable?: Pick<FirstSidebarStepperStep, 'isSelectable'>;
      } = {}) => ({
        payload: {
          id,
          ...((status !== undefined) && { status }),
          ...((typeof isSelectable === 'boolean') && { isSelectable }),
        },
      }),
      reducer: (state, { payload: { id, status, isSelectable } }: PayloadAction<Pick<FirstSidebarStepperStep, 'id'> & Partial<Pick<FirstSidebarStepperStep, 'status' | 'isSelectable'>>>) => {
        if (state.stepper.steps.byId[id]) {
          if (status) {
            state.stepper.steps.byId[id].status = status;
          }

          if (typeof isSelectable === 'boolean') {
            state.stepper.steps.byId[id].isSelectable = isSelectable;
          }
        }
      },
    },
  },


  selectors: {
    /**
     * Selector that returns the title value to be displayed in the first sidebar.
     */
    selectTitle: (state: FirstSidebarState) => state.title,


    /**
     * Selector that returns the content path, if set in the configuration. If not set, an empty
     * string is returned.
     */
    selectContentPath: (state: FirstSidebarState) => state.content.path,


    /**
     * Selector that returns true if the stepper of the first sidebar is set as visible or false if
     * not.
     */
    selectIsStepperVisible: (state: FirstSidebarState) => state.stepper.show,


    /**
     * Selector to return an array of the IDs of all steps of the stepper of the first sidebar. If
     * there are no stepper steps, an empty array is returned.
     */
    selectStepIds: (state: FirstSidebarState) => state.stepper.steps.allIds,


    /**
     * Selector that returns true, if a step of the stepper of the first sidebar, selected by a
     * given ID exists or false if not.
     */
    selectStepExists: (state: FirstSidebarState, id: string | number) => state.stepper.steps.allIds.includes(id),


    /**
     * Selector that returns an object of a step of the stepper of the first sidebar, selected by a
     * given ID. If no step is found, null is returned.
     */
    selectStep: (state: FirstSidebarState, id: string | number) => state.stepper.steps.byId[id] ?? null,


    /**
     * Selector that returns an object of the active step of the stepper of the first sidebar. If
     * there is no active step, null is returned.
     */
    selectActiveStep: (state: FirstSidebarState) => (state.stepper.steps.byId[state.stepper.activeId] ?? null),


    /**
     * Selector that returns true, if a step of the stepper of the first sidebar, selected by a
     * given ID is active or false if not.
     */
    selectIsStepActive: (state: FirstSidebarState, id: string | number) => (state.stepper.activeId === id),
  },
});


declare module 'store/store.types' {
  export interface LazyLoadedSlices extends WithSlice<typeof slice> {} // eslint-disable-line @typescript-eslint/no-empty-object-type
}

rootReducer.inject({
  reducerPath: slice.reducerPath,
  reducer: enhancedReducerCreator<FirstSidebarState>(slice, createInitialState),
});


export const { name } = slice;

export const {
  configure, setTitle, setStepperData, showStepper, hideStepper, setActiveStep, setStepStatus,
} = slice.actions;

export const {
  selectTitle, selectContentPath, selectIsStepperVisible, selectStepIds, selectStepExists,
  selectStep, selectActiveStep, selectIsStepActive,
} = slice.getSelectors((rootState: RootState) => rootState[slice.reducerPath] ?? initialState);
