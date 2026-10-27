import { Enumify } from 'enumify';
import PropTypes from 'prop-types';
import {
  useContext, useState, useRef, useCallback, useEffect,
} from 'react';

import imageViewerDefines from '../defines';
import { ImageDataContext, actions as imageDataActions, selectors as imageDataSelectors } from '../imageDataReducer';


/**
 * Enumeration for the lifecycle steps of the animation frame.
 */
class AnimationStep extends Enumify {
  static INIT = new AnimationStep();
  static READY_TO_FADE_OUT = new AnimationStep();
  static FADE_OUT = new AnimationStep();
  static READY_TO_FADE_IN = new AnimationStep();
  static FADE_IN = new AnimationStep();
  static SHOW = new AnimationStep();
  static _ = this.closeEnum();
}


const fadeInOutTimeMs = imageViewerDefines.imageChangeTransitionTimeMs / 2;


/**
 * Props proxy high order component (ppHOC) to wrap the Image component and manipulate the given
 * props by a timing state machine.
 */
const withImage = (WrappedComponent) => {
  const WithImage = (props) => {
    // ------------------------------------------------------------------<editor-fold desc="States">
    // States
    // ---------------------------------------------------------------------------------------------

    const {
      id, src, onSetImageDelayed,
    } = props;

    const { imageDataState, imageDataDispatch } = useContext(ImageDataContext);
    const isZoomEnabled = imageDataSelectors.isZoomEnabled(imageDataState, id);
    const zoom = imageDataSelectors.getZoomById(imageDataState, id) ?? imageDataSelectors.getFittingZoomById(imageDataState, id);

    const [delayedProps, setDelayedProps] = useState({
      id: null, src: null, alt: null, zoom: null,
    });
    const [enableInteractions, setEnableInteractions] = useState(false); // true at state "SHOW"
    const [fadeOut, setFadeOut] = useState(false); // true at state "FADE_OUT"

    const animationDataRef = useRef();
    const prevsRef = useRef({});


    //                                                                                </editor-fold>
    // ---------------------------------------------------------<editor-fold desc="Local Variables">
    // Local Variables
    // ---------------------------------------------------------------------------------------------


    //                                                                                </editor-fold>
    // --------------------------------------------------------<editor-fold desc="Helper Functions">
    // Helper Functions
    // ---------------------------------------------------------------------------------------------

    /**
     *
     */
    const animate = useCallback((timestamp) => {
      switch (animationDataRef.current.step) {
        // -----------------------------------------------------------------------------------------
        case AnimationStep.READY_TO_FADE_OUT:
        // -----------------------------------------------------------------------------------------

          // Set some flags and immediatelly go to "FADE_OUT".
          setEnableInteractions(false);
          setFadeOut(true);

          animationDataRef.current.startTimestampMs = timestamp;
          animationDataRef.current.step = AnimationStep.FADE_OUT;
          animationDataRef.current.reqAnimFrame = window.requestAnimationFrame(animate);
          break;

        // -----------------------------------------------------------------------------------------
        case AnimationStep.FADE_OUT:
        // -----------------------------------------------------------------------------------------

          // Wait until the image is faded out, then set some flags and go to "READY_TO_FADE_IN".
          if (timestamp > (animationDataRef.current.startTimestampMs + fadeInOutTimeMs)) {
            setFadeOut(false);
            animationDataRef.current.step = AnimationStep.READY_TO_FADE_IN;
          }
          animationDataRef.current.reqAnimFrame = window.requestAnimationFrame(animate);
          break;

        // -----------------------------------------------------------------------------------------
        case AnimationStep.READY_TO_FADE_IN:
        // -----------------------------------------------------------------------------------------

          // Set the next image here and immediatelly go to "FADE_IN". Note that id, src and zoom
          // are from that moment, animate was started in the effect below. No updates during the
          // previous steps are recognized.
          setDelayedProps({
            id, src, alt: id, zoom,
          });
          onSetImageDelayed(id);

          animationDataRef.current.startTimestampMs = timestamp;
          animationDataRef.current.step = AnimationStep.FADE_IN;
          animationDataRef.current.reqAnimFrame = window.requestAnimationFrame(animate);
          break;

        // -----------------------------------------------------------------------------------------
        case AnimationStep.FADE_IN:
        // -----------------------------------------------------------------------------------------

          // Wait until the new image is faded in, then set some flags and go to "SHOW", where the
          // animation ends automatically.
          if (timestamp > (animationDataRef.current.startTimestampMs + fadeInOutTimeMs)) {
            setEnableInteractions(true);
            animationDataRef.current.step = AnimationStep.SHOW;
          }
          animationDataRef.current.reqAnimFrame = window.requestAnimationFrame(animate);
          break;

        // no default
      }
    }, [id, src, zoom, onSetImageDelayed]);


    //                                                                                </editor-fold>
    // ----------------------------------------------------------<editor-fold desc="Event Handlers">
    // Event Handlers
    // ---------------------------------------------------------------------------------------------

    /**
     *
     */
    const handleZoomInOut = useCallback((dir, { limitToFit = false } = { limitToFit: false }) => {
      if ((animationDataRef.current.step === AnimationStep.SHOW) && isZoomEnabled) {
        imageDataDispatch(imageDataActions.zoomInOut(id, dir, { limitToFit }));
      }
    }, [id, imageDataDispatch, isZoomEnabled]);


    //                                                                                </editor-fold>
    // -----------------------------------------------------------------<editor-fold desc="Effects">
    // Effects
    // ---------------------------------------------------------------------------------------------

    useEffect(() => {
      if (!animationDataRef.current) {
        animationDataRef.current = {
          startTimestampMs: undefined,
          step: AnimationStep.INIT,
          reqAnimFrame: undefined,
        };
      }

      // Changing of prop "src" (re-)starts the animation state machine.
      if (src && (src !== prevsRef.current.src)) {
        window.cancelAnimationFrame(animationDataRef.current.reqAnimFrame);
        animationDataRef.current.step = (animationDataRef.current.step === AnimationStep.INIT)
          ? AnimationStep.READY_TO_FADE_IN
          : AnimationStep.READY_TO_FADE_OUT;
        animationDataRef.current.reqAnimFrame = window.requestAnimationFrame(animate);
      }

      // Changing of prop "zoom" while state "FADE_IN" or "SHOW" will actualize it.
      if (
        zoom && (zoom !== prevsRef.current.zoom)
        && (
          (animationDataRef.current.step === AnimationStep.FADE_IN)
          || (animationDataRef.current.step === AnimationStep.SHOW)
        )
      ) {
        setDelayedProps((prevValue) => ((zoom !== prevValue.zoom) ? { ...prevValue, zoom } : prevValue));
      }

      prevsRef.current.src = src;
      prevsRef.current.zoom = zoom;
    }, [id, src, zoom, animate]);


    useEffect(() => () => {
      window.cancelAnimationFrame(animationDataRef.current.reqAnimFrame);
      animationDataRef.current = undefined;
    }, []);


    //                                                                                </editor-fold>
    // ------------------------------------------------------------------<editor-fold desc="Render">
    // Render
    // ---------------------------------------------------------------------------------------------

    return (
      <WrappedComponent
        {...props}
        {...delayedProps}
        enableInteractions={enableInteractions}
        fadeOut={fadeOut}
        onZoomInOut={handleZoomInOut}
      />
    );
    //                                                                                </editor-fold>
  };

  WithImage.displayName = `withImage(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  WithImage.propTypes = {
    id: PropTypes.string,
    src: PropTypes.string,
    onSetImageDelayed: PropTypes.func,
  };

  WithImage.defaultProps = {
    id: null,
    src: null,
    onSetImageDelayed() {},
  };

  return WithImage;
};

export default withImage;
