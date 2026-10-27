import { Enumify } from 'enumify'; // eslint-disable-line max-classes-per-file
import {
  useState, useRef, useMemo, useEffect,
} from 'react';

import defines from 'assets/defines';
import Enums from 'assets/enums';


/**
 * Enumeration for the lifecycle steps of the animation frame.
 */
class AnimationStep extends Enumify {
  static IS_HIDED = new AnimationStep();
  static START_FADING_IN = new AnimationStep();
  static FADING_IN_1 = new AnimationStep();
  static FADING_IN_2 = new AnimationStep();
  static IS_SHOWN = new AnimationStep();
  static START_FADING_OUT = new AnimationStep();
  static FADING_OUT_1 = new AnimationStep();
  static _ = this.closeEnum();
}


/**
 * React hook to provide steps to fade in / out an element by an animation time: if HIDE, you can
 * hide the element (e.g. by setting CSS attribute "display" to "none"). If READY_TO_FADE_IN, show
 * it but without opacity. If FADE_IN, switch the opacity to the visible value. After the animation
 * time, the state is switched to SHOW. If FADE_OUT, switch the opacity to the invisible value.
 * After the animation time, the state is switched to HIDE and the element can by hided.
 * The visibility state is also returned as an inline style object with attributes "display" and
 * "opacity".
 *
 * @param {boolean} show - Set to true or to false to show or hide the element.
 * @param {object} options
 * @param {number} [options.fadeInTimeMs] - Optional the animation time for fading in in
 *   milliseconds. By default, the default animation time defined in the assets defines is used.
 * @param {number} [options.fadeOutTimeMs] - Optional the animation time for fading out in
 *   milliseconds. By default, the default animation time defined in the assets defines is used.
 * @param {number} [options.invisibleOpacity=0] - The opacity value between 0 and 1 for the returned
 *   style object, if the element has to be invisible.
 * @param {number} [options.visibleOpacity=1] - The opacity value between 0 and 1 for the returned
 *   style object, if the element has to be visible.
 * @returns {{ visibilityState: Visibility, style: object }}
 */
const useFadeInOut = (show, {
  fadeInTimeMs = defines.layout.fadeInOutTimeMs,
  fadeOutTimeMs = defines.layout.fadeInOutTimeMs,
  invisibleOpacity = 0,
  visibleOpacity = 1,
} = {
  fadeInTimeMs: defines.layout.fadeInOutTimeMs,
  fadeOutTimeMs: defines.layout.fadeInOutTimeMs,
  invisibleOpacity: 0,
  visibleOpacity: 1,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [visibilityState, setVisibilityState] = useState(show ? Enums.Visibility.SHOW : Enums.Visibility.HIDE);

  const animationDataRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const style = useMemo(() => {
    switch (visibilityState) {
      case Enums.Visibility.HIDE:
        return { display: 'none', opacity: invisibleOpacity };
      case Enums.Visibility.READY_TO_FADE_IN:
      case Enums.Visibility.FADE_OUT:
        return { opacity: invisibleOpacity };
      case Enums.Visibility.FADE_IN:
      case Enums.Visibility.SHOW:
        return { opacity: visibleOpacity };
      default:
        return {};
    }
  }, [visibilityState, invisibleOpacity, visibleOpacity]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const animate = (timestamp) => {
    switch (animationDataRef.current.step) {
      // -------------------------------------------------------------------------------------------
      case AnimationStep.START_FADING_IN:
      // -------------------------------------------------------------------------------------------

        setVisibilityState(() => {
          animationDataRef.current.startTimestampMs = timestamp;
          animationDataRef.current.step = AnimationStep.FADING_IN_1;
          animationDataRef.current.reqAnimFrame = window.requestAnimationFrame(animate);

          return Enums.Visibility.READY_TO_FADE_IN;
        });
        break;

      // -------------------------------------------------------------------------------------------
      case AnimationStep.FADING_IN_1:
      // -------------------------------------------------------------------------------------------

        setVisibilityState(() => {
          animationDataRef.current.step = AnimationStep.FADING_IN_2;
          animationDataRef.current.reqAnimFrame = window.requestAnimationFrame(animate);

          return Enums.Visibility.FADE_IN;
        });
        break;

      // -------------------------------------------------------------------------------------------
      case AnimationStep.FADING_IN_2:
      // -------------------------------------------------------------------------------------------

        if ((timestamp - animationDataRef.current.startTimestampMs) > fadeInTimeMs) {
          setVisibilityState(() => {
            animationDataRef.current.step = AnimationStep.IS_SHOWN;
            return Enums.Visibility.SHOW;
          });
        } else {
          animationDataRef.current.reqAnimFrame = window.requestAnimationFrame(animate);
        }
        break;

      // -------------------------------------------------------------------------------------------
      case AnimationStep.START_FADING_OUT:
      // -------------------------------------------------------------------------------------------

        setVisibilityState(() => {
          animationDataRef.current.startTimestampMs = timestamp;
          animationDataRef.current.step = AnimationStep.FADING_OUT_1;
          animationDataRef.current.reqAnimFrame = window.requestAnimationFrame(animate);

          return Enums.Visibility.FADE_OUT;
        });
        break;

      // -------------------------------------------------------------------------------------------
      case AnimationStep.FADING_OUT_1:
      // -------------------------------------------------------------------------------------------

        if ((timestamp - animationDataRef.current.startTimestampMs) > fadeOutTimeMs) {
          setVisibilityState(() => {
            animationDataRef.current.step = AnimationStep.IS_HIDED;
            return Enums.Visibility.HIDE;
          });
        } else {
          animationDataRef.current.reqAnimFrame = window.requestAnimationFrame(animate);
        }
        break;

      // no default
    }
  };


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (!animationDataRef.current) {
      animationDataRef.current = {
        startTimestampMs: undefined,
        step: show ? AnimationStep.IS_SHOWN : AnimationStep.IS_HIDED,
        reqAnimFrame: undefined,
      };
    }

    if (
      show
      && (
        (animationDataRef.current.step === AnimationStep.IS_HIDED)
        || (animationDataRef.current.step.enumOrdinal >= AnimationStep.START_FADING_OUT.enumOrdinal)
      )
    ) {
      // start fading in if IS_HIDED, START_FADING_OUT or FADING_OUT_1
      animationDataRef.current.step = AnimationStep.START_FADING_IN;
      animationDataRef.current.reqAnimFrame = requestAnimationFrame(animate);
    } else if (
      !show
      && (animationDataRef.current.step.enumOrdinal >= AnimationStep.START_FADING_IN.enumOrdinal)
      && (animationDataRef.current.step.enumOrdinal <= AnimationStep.IS_SHOWN.enumOrdinal)
    ) {
      // start fading out if START_FADING_IN, FADING_IN_1, FADING_IN_2 or IS_SHOWN
      animationDataRef.current.step = AnimationStep.START_FADING_OUT;
      animationDataRef.current.reqAnimFrame = requestAnimationFrame(animate);
    }
  });

  useEffect(() => () => {
    window.cancelAnimationFrame(animationDataRef.current.reqAnimFrame);
  }, []);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return {
    visibilityState,
    style,
  };
  //                                                                                  </editor-fold>
};

export default useFadeInOut;
// Deprecated: do not export Enums.Visibility any more
export const VisibilityState = Enums.Visibility;
