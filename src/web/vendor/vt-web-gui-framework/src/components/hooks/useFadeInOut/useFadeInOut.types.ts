/** The visibility status of an element whose visibility is animated. */
export type Visibility = 'hide' | 'readyToFadeIn' | 'fadeIn' | 'show' | 'readyToFadeOut' | 'fadeOut';


export type AnimationStep = Visibility | 'startFadingIn' | 'startFadingOut';


/** The props of the React hook "useFadeInOut". */
export interface UseFadeInOutProps {
  /** Switch to true or to false to start showing or hiding the element. */
  readonly show: boolean;
  /** Optional a waiting time before start fading in the element in milliseconds (status
   * "readyToFadeIn"). Default: 0. */
  readonly waitBeforeFadingInMs?: number;
  /** Optional the animation time for fading in the element in milliseconds (status "fadeIn"). By
   * default, the medium animation time defined in the layout assets is used. */
  readonly fadeInTimeMs?: number;
  /** Optional a waiting time before start fading out the element in milliseconds (status
   * "readyToFadeOut"). Default: 0. */
  readonly waitBeforeFadingOutMs?: number;
  /** Optional the animation time for fading out the element in milliseconds (status "fadeOut"). By
   * default, the medium animation time defined in the layout assets is used. */
  readonly fadeOutTimeMs?: number;
  /** The opacity value between 0 and 1 for the returned style object, if the element has to be
   * invisible (at statuses "hide", "readyToFadeIn" and "fadeOut"). */
  readonly invisibleOpacity?: number;
  /** The opacity value between 0 and 1 for the returned style object, if the element has to be
   * visible (at statuses "fadeIn", "show" and "readyToFadeOut"). */
  readonly visibleOpacity?: number;
}


/**  */
export interface UseFadeInOutResult {
  /** The current visibility status */
  visibility: Visibility;
  /** Object with up to two CSS properties: property "display" is set with value "none" when the
   * visibility status is "HIDE". Property "opacity" is with an opacitiy value depending on the
   * visibility status. */
  style: React.CSSProperties;
}
