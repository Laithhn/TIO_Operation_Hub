import { bbCode } from 'utils/bbCode';
import { classNames } from 'utils/classNames';

import * as css from './proposal.scss';
import type { ProposalProps } from './proposal.types';


/**
 * React sub-component of the control component "Input" to show an entry in the proposal
 * list of the input component.
 */
const Proposal = ({ idx, text, onClick }: ProposalProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isClickFunc = (typeof onClick === 'function');


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the synthetic React event "onClick" to delegate click events of this proposal entry
   * to the parent component, returning the key of this option.
   */
  const handleClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
    onClick?.(idx, event);
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const proposalClasses = classNames(css.proposal, {
    [css.italic]: !isClickFunc,
  });

  return (
    <div
      key={idx}
      role="button"
      tabIndex={-1}
      className={proposalClasses}
      onClick={handleClick}
      onKeyUp={undefined}
      onKeyDown={undefined}
    >
      {bbCode(text) || '\u{a0}'}
    </div>
  );
  //                                                                                  </editor-fold>
};

Proposal.displayName = 'Proposal';


export { Proposal };
