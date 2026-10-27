import {
  memo, useRef, useState, useCallback, useEffect,
} from 'react';
import { useSelector } from 'react-redux';

import { selectors } from 'store';

import Marker from '../marker';
import Step from './step';
import css from './stepper.scss';


/**
 * React component of the stepper container in the first sidebar.
 */
const Stepper = memo(() => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const stepIds = useSelector(selectors.sidebars.stepper.getStepIds);
  const isActiveStep = !!useSelector(selectors.sidebars.stepper.getActiveStep);

  const [activeStepCenterPosY, setActiveStepCenterPosY] = useState(null);

  const stepsHeightsRef = useRef({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler to store the height of a step.
   */
  const handleSetHeight = useCallback((id, height) => {
    stepsHeightsRef.current[id] = height;
  }, []);


  /**
   * Handler to signalize, that one of the steps becomes active. Take the given internal offset of
   * this node, add the height of all steps before of it and set this position as center position
   * for the marker.
   */
  const handleActive = useCallback((id, offset) => {
    let pos = offset;

    for (let i = 0; i < stepIds.length; i++) {
      if (stepIds[i] === id) {
        break;
      }
      pos += (stepsHeightsRef.current[stepIds[i]] ?? 0);
    }

    setActiveStepCenterPosY(pos);
  }, [stepIds]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // Effect to reset the center position for the marker, if no entry is active.
  useEffect(() => {
    if (!isActiveStep) {
      setActiveStepCenterPosY(null);
    }
  }, [isActiveStep]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <div className={css.stepper}>
      {stepIds.map((id, idx) => (
        <Step
          key={id}
          stepNum={idx + 1}
          stepId={id}
          stepIdBefore={(idx > 0) ? stepIds[idx - 1] : null}
          stepIdAfter={(idx < (stepIds.length - 1)) ? stepIds[idx + 1] : null}
          onSetHeight={handleSetHeight}
          onActive={handleActive}
        />
      ))}
      <Marker centerPosY={activeStepCenterPosY} />
    </div>
  );
  //                                                                                  </editor-fold>
});

Stepper.displayName = 'Stepper';

export default Stepper;
