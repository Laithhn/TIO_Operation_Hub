import PropTypes from 'prop-types'; // eslint-disable-line max-classes-per-file
import { memo } from 'react';

import Icon from 'components/indicators/icon';
import useStylingProps from 'components/hooks/useStylingProps';
import classNames from 'utils/classNames';

import { StepperOrientation, StepperState } from './enums';
import stylingProps from './stylingProps';
import css from './stepper.scss';

/**
 * Sliding window generator
 */
function* windowGenerator(inputArray, size) {
  for (let index = 0; index + size <= inputArray.length; index++) {
    yield inputArray.slice(index, index + size);
  }
}

/**
 * Memoized React component of a stepper control element.
 */
const Stepper = memo(({
  steps,
  activeStepIndex,
  stepperOrientation,
  onClick,
  ...restProps
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, stylingProps);

  const stepsDethunked = typeof steps === 'function' ? steps() : steps;

  // Separators can be invisible (null), inactive (false) and active (true)
  const stepsWithSeparatorInformation = Array.from(windowGenerator([null, ...stepsDethunked, null], 3)).map(([predecessor, current, successor]) => {
    const separatorBeforeActive = predecessor === null ? null : predecessor.state !== StepperState.OPEN && current.state !== StepperState.OPEN;
    const separatorAfterActive = successor === null ? null : current.state !== StepperState.OPEN && successor.state !== StepperState.OPEN;
    return { separatorBeforeActive, ...current, separatorAfterActive };
  });

  // separatorBeforeActive={ index === 0 ? null : index <= activeStepIndex}
  // separatorAfterActive={ index === stepsWithSeparatorInformation.length - 1 ? null : index < activeStepIndex}

  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const stepperClasses = classNames(css.stepper, {
    [css.horizontal]: (stepperOrientation === StepperOrientation.HORIZONTAL),
    [css.vertical]: (stepperOrientation === StepperOrientation.VERTICAL),
  });

  return (
    <div className={stepperClasses} style={outerElemStyle}>
      {stepsWithSeparatorInformation.map((step, index) => {
        const active = index === activeStepIndex;

        const stepperStepClasses = classNames(css.stepperStep, {
          [css.active]: active,
          [css.done]: (((step.state === StepperState.DONE) || (step.state === StepperState.VERIFIED)) && !active),
          [css.selectable]: step.selectable === undefined ? true : step.selectable,
          [css.horizontal]: (stepperOrientation === StepperOrientation.HORIZONTAL),
          [css.vertical]: (stepperOrientation === StepperOrientation.VERTICAL),
        });

        const sepBeforeClasses = classNames(css.stepperStepSepBefore, {
          [css.done]: (step.separatorBeforeActive === true),
          [css.horizontal]: (stepperOrientation === StepperOrientation.HORIZONTAL),
          [css.vertical]: (stepperOrientation === StepperOrientation.VERTICAL),
        });

        const sepAfterClasses = classNames(css.stepperStepSepAfter, {
          [css.done]: (step.separatorAfterActive === true),
          [css.horizontal]: (stepperOrientation === StepperOrientation.HORIZONTAL),
          [css.vertical]: (stepperOrientation === StepperOrientation.VERTICAL),
        });

        return (
          <button
            key={index} // eslint-disable-line react/no-array-index-key
            type="button"
            className={stepperStepClasses}
            onClick={(event) => {
              onClick(index, event);
            }}
          >
            {(step.separatorBeforeActive !== null) && <span className={sepBeforeClasses} />}
            <span className={css.icon}>
              {(step.state === StepperState.VERIFIED)
                ? <Icon icon="OK" size={15} />
                : index}
            </span>
            <span className={css.caption}>{step.label}</span>
            {(step.separatorAfterActive !== null) && <span className={sepAfterClasses} />}
          </button>
        );
      })}
    </div>
  );
  //                                                                                  </editor-fold>
});

Stepper.displayName = 'Stepper';

Stepper.propTypes = {
  steps: PropTypes.oneOfType([PropTypes.func, PropTypes.arrayOf(PropTypes.exact({
    label: PropTypes.string.isRequired,
    state: PropTypes.instanceOf(StepperState).isRequired,
  }))]).isRequired,
  activeStepIndex: PropTypes.number,
  stepperOrientation: PropTypes.instanceOf(StepperOrientation),
  onClick: PropTypes.func,
};

Stepper.defaultProps = {
  activeStepIndex: null,
  stepperOrientation: StepperOrientation.HORIZONTAL,
  onClick() {},
};

export { StepperOrientation, StepperState };
export default Stepper;
