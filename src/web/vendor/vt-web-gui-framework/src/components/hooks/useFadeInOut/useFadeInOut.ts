import { useEffect, useRef, useState } from 'react';

import { layout } from 'assets/styles';

import type {
  AnimationStep, UseFadeInOutProps, UseFadeInOutResult, Visibility,
} from './useFadeInOut.types';


/**
 * React hook to provide statuses to fade in / out an element with animation times, controlled by
 * switching the boolean prop "show". The visibility status is also returned as an inline style
 * object with attributes "display" and "opacity".
 */
export const useFadeInOut = ({
  show,
  waitBeforeFadingInMs = 0,
  fadeInTimeMs = layout.animationTime.mediumMs,
  waitBeforeFadingOutMs = 0,
  fadeOutTimeMs = layout.animationTime.mediumMs,
  invisibleOpacity = 0,
  visibleOpacity = 1,
}: UseFadeInOutProps): UseFadeInOutResult => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [visibility, setVisibility] = useState<Visibility>(show ? 'show' : 'hide');

  const startTimestampMsRef = useRef(0);
  const animationStepRef = useRef<AnimationStep>(show ? 'show' : 'hide');
  const reqAnimFrameRef = useRef<ReturnType<typeof requestAnimationFrame>>(0);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const getStyle = () => {
    switch (visibility) {
      case 'hide':
        return { display: 'none', opacity: invisibleOpacity };
      case 'readyToFadeIn':
      case 'fadeOut':
        return { opacity: invisibleOpacity };
      case 'fadeIn':
      case 'show':
      case 'readyToFadeOut':
        return { opacity: visibleOpacity };
      default:
        return {};
    }
  };


  const animate = (timestamp: DOMHighResTimeStamp) => {
    switch (animationStepRef.current) {
      // -------------------------------------------------------------------------------------------
      case 'startFadingIn':
      // -------------------------------------------------------------------------------------------

        setVisibility(() => {
          startTimestampMsRef.current = timestamp;
          animationStepRef.current = 'readyToFadeIn';
          reqAnimFrameRef.current = requestAnimationFrame(animate);

          return 'readyToFadeIn';
        });
        break;

      // -------------------------------------------------------------------------------------------
      case 'readyToFadeIn':
      // -------------------------------------------------------------------------------------------

        if ((timestamp - startTimestampMsRef.current) >= waitBeforeFadingInMs) {
          setVisibility(() => {
            startTimestampMsRef.current = timestamp;
            animationStepRef.current = 'fadeIn';
            reqAnimFrameRef.current = requestAnimationFrame(animate);

            return 'fadeIn';
          });
        } else {
          reqAnimFrameRef.current = requestAnimationFrame(animate);
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'fadeIn':
      // -------------------------------------------------------------------------------------------

        if ((timestamp - startTimestampMsRef.current) >= fadeInTimeMs) {
          setVisibility(() => {
            animationStepRef.current = 'show';
            return 'show';
          });
        } else {
          reqAnimFrameRef.current = requestAnimationFrame(animate);
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'show':
      // -------------------------------------------------------------------------------------------

        setVisibility('show');
        break;

      // -------------------------------------------------------------------------------------------
      case 'startFadingOut':
      // -------------------------------------------------------------------------------------------

        setVisibility(() => {
          startTimestampMsRef.current = timestamp;
          animationStepRef.current = 'readyToFadeOut';
          reqAnimFrameRef.current = requestAnimationFrame(animate);

          return 'readyToFadeOut';
        });
        break;

      // -------------------------------------------------------------------------------------------
      case 'readyToFadeOut':
      // -------------------------------------------------------------------------------------------

        if ((timestamp - startTimestampMsRef.current) >= waitBeforeFadingOutMs) {
          setVisibility(() => {
            startTimestampMsRef.current = timestamp;
            animationStepRef.current = 'fadeOut';
            reqAnimFrameRef.current = requestAnimationFrame(animate);

            return 'fadeOut';
          });
        } else {
          reqAnimFrameRef.current = requestAnimationFrame(animate);
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'fadeOut':
      // -------------------------------------------------------------------------------------------

        if ((timestamp - startTimestampMsRef.current) > fadeOutTimeMs) {
          setVisibility(() => {
            animationStepRef.current = 'hide';
            return 'hide';
          });
        } else {
          reqAnimFrameRef.current = requestAnimationFrame(animate);
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'hide':
      // -------------------------------------------------------------------------------------------

        setVisibility('hide');
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
    if (show) {
      if ((['startFadingOut', 'readyToFadeOut'] satisfies AnimationStep[]).some((step) => (step === animationStepRef.current))) {
        // stay showing
        animationStepRef.current = 'show';
        reqAnimFrameRef.current = requestAnimationFrame(animate);
      } else if ((['fadeOut', 'hide'] satisfies AnimationStep[]).some((step) => (step === animationStepRef.current))) {
        // start fading in
        animationStepRef.current = 'startFadingIn';
        reqAnimFrameRef.current = requestAnimationFrame(animate);
      }
    } else if ((['startFadingIn', 'readyToFadeIn'] satisfies AnimationStep[]).some((step) => (step === animationStepRef.current))) {
      // stay hided
      animationStepRef.current = 'hide';
      reqAnimFrameRef.current = requestAnimationFrame(animate);
    } else if ((['fadeIn', 'show'] satisfies AnimationStep[]).some((step) => (step === animationStepRef.current))) {
      // start fading out
      animationStepRef.current = 'startFadingOut';
      reqAnimFrameRef.current = requestAnimationFrame(animate);
    }
  });


  useEffect(() => () => {
    cancelAnimationFrame(reqAnimFrameRef.current);
  }, []);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return {
    visibility,
    style: getStyle(),
  };
  //                                                                                  </editor-fold>
};
