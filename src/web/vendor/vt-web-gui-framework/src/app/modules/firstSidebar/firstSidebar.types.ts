/** Enumeration of the status of a stepper step: if a step is "open", it has not yet been processed.
 * If "done", the step is currently being or has already been processed. Id "verified", the step has
 * been processed and checked. */
export type StepperStepStatus = 'open' | 'done' | 'verified';


export interface FirstSidebarStepperStep {
  /** The ID of the step. */
  id: string | number;
  /** The caption of the step. */
  caption: string;
  /** The current status of the step. */
  status: StepperStepStatus;
  /** True, if the step is selectable (clickable) or false if not. */
  isSelectable: boolean;
}


/** The Redux state of the slice of the app module "FirstSidebar". */
export interface FirstSidebarState {
  /** The title text or translation key to show on top of the first sidebar. If an empty string, the
   * title field is not displayed. */
  title: string;
  /** Data of the optionally content area at the bottom of the first sidebar. */
  content: {
    /** The path to the content file to show in the content section at the bottom of the first
     * sidebar. It is an empty string, if there is no content to show. */
    path: string;
  };
  stepper: {
    /** True if the stepper is shown or false if not. */
    show: boolean;
    /** The ID of the currently active step. */
    activeId: string | number;
    steps: {
      /** Object with the data objects of all stepper steps of the first sidebar. The keys are the IDs
       * of the steps. */
      byId: Record<string | number, FirstSidebarStepperStep>;
      /** The IDs of all stepper steps of the first sidebar. */
      allIds: (string | number)[];
    };
  };
}
