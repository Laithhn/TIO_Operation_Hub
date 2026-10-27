import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { memo, useRef, useEffect } from 'react';

import Enums from 'assets/enums';
import Icon from 'components/indicators/icon';
import { actions, selectors, hooks } from 'store';
import classNames from 'utils/classNames';

import css from './step.scss';


/**
 *
 */
const Step = memo(({
  stepNum, stepId, stepIdBefore, stepIdAfter, onSetHeight, onActive,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = hooks.useI18n();

  const step = useSelector((state) => selectors.sidebars.stepper.getStepById(state, stepId));
  const stepBefore = useSelector((state) => selectors.sidebars.stepper.getStepById(state, stepIdBefore));
  const stepAfter = useSelector((state) => selectors.sidebars.stepper.getStepById(state, stepIdAfter));
  const isActive = useSelector((state) => selectors.sidebars.stepper.isStepActiveById(state, stepId));

  const stepRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const status = Enums.StepperState.enumValueOf(step.status);
  const { caption, selectable } = step;

  const sepBefore = stepBefore
    ? (Enums.StepperState.enumValueOf(stepBefore.status) !== Enums.StepperState.OPEN)
    : null;

  const sepAfter = stepAfter
    ? (status !== Enums.StepperState.OPEN)
    : null;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const handleClick = () => {
    dispatch(actions.sidebars.stepper.setActiveStep(stepId));
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    onSetHeight(stepId, stepRef.current.clientHeight);
  }, [onSetHeight, stepId, caption]);


  useEffect(() => {
    if (isActive) {
      onActive(stepId, stepRef.current.clientHeight / 2);
    }
  }, [onActive, isActive, stepId]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const stepperStepClasses = classNames(css.step, {
    [css.done]: ((status === Enums.StepperState.DONE) || (status === Enums.StepperState.VERIFIED)),
    [css.selectable]: selectable,
    [css.active]: isActive,
  });

  const sepBeforeClasses = classNames(css.sepBefore, {
    [css.done]: (sepBefore === true),
  });

  const sepAfterClasses = classNames(css.sepAfter, {
    [css.done]: (sepAfter === true),
  });

  return (
    <div
      ref={stepRef}
      role="button"
      aria-disabled={!selectable}
      className={stepperStepClasses}
      {...(selectable && {
        tabIndex: 0,
        onClick: handleClick,
      })}
    >
      {(sepBefore !== null) && <span className={sepBeforeClasses} />}
      <span className={css.icon}>
        {(status === Enums.StepperState.VERIFIED)
          ? <Icon icon="OK" size={15} />
          : stepNum}
      </span>
      <span className={css.caption}>{translateText(caption)}</span>
      {(sepAfter !== null) && <span className={sepAfterClasses} />}
    </div>
  );
});

Step.displayName = 'Step';

Step.propTypes = {
  stepNum: PropTypes.number.isRequired,
  stepId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  stepIdBefore: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  stepIdAfter: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSetHeight: PropTypes.func,
  onActive: PropTypes.func,
};

Step.defaultProps = {
  stepIdBefore: null,
  stepIdAfter: null,
  onSetHeight() {},
  onActive() {},
};

export default Step;
