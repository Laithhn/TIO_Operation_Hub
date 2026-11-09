import { useContext, useState } from 'react';

import { useFadeInOut } from 'components/hooks/useFadeInOut';

import { ImageDataContext } from '../imageData.context';
import {
  selectFittingZoomById, selectIsZoomEnabled, selectZoomById, zoomInOut,
} from '../imageData.reducer';
import * as cssImageViewer from '../imageViewer.scss';

import type { ShownImage, UseImageChangeProps, UseImageChangeResult } from './useImageChange.types';


// One half of the time a change of the image takes: the old one fades out in the first half, the
// new one fades in during the second. A stylesheet exports its values as strings, so the number is
// made once, here.
const fadeInOutTimeMs = Number(cssImageViewer.imageChangeTransitionTimeMs) / 2;


/**
 * Hook of the popup component "ImageViewer" that carries one image over into the next: the image on
 * screen fades out, the new one takes its place while nothing is visible, and it fades in. The
 * element therefore renders a pair that lags behind the props, which is what this hook hands back.
 *
 * The timing is the fade hook's, and the swap is the one thing left to do - it happens the moment
 * the fade reports that nothing is on screen. What arrives during the change is not taken over
 * halfway: the props are read again at that moment, so a viewer switched twice in quick succession
 * lands on the image it was last asked for.
 */
export const useImageChange = ({
  id = null, src = null,
}: UseImageChangeProps): UseImageChangeResult => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { imageDataState, imageDataDispatch } = useContext(ImageDataContext);

  const [shownImage, setShownImage] = useState<ShownImage>({ id, src });


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { visibility } = useFadeInOut({
    show: (src === shownImage.src),
    fadeInTimeMs: fadeInOutTimeMs,
    fadeOutTimeMs: fadeInOutTimeMs,
  });

  // The swap, derived in the render body behind a comparison that the swap itself answers.
  if ((visibility === 'hide') && (src !== shownImage.src)) {
    setShownImage({ id, src });
  }

  const shownImageId = shownImage.id ?? '';
  const isZoomEnabled = selectIsZoomEnabled(imageDataState, shownImageId);
  const zoom = selectZoomById(imageDataState, shownImageId)
    ?? selectFittingZoomById(imageDataState, shownImageId);
  // The image stands still at "show" alone; every other status belongs to a change in progress.
  const enableInteractions = (visibility === 'show');
  // Visible are the two animated halves and the standing image between them. Everything else is the
  // gap in the middle of the change, where the swap happens and nothing may be seen of it.
  const isVisible = (visibility === 'fadeIn') || (visibility === 'show') || (visibility === 'readyToFadeOut');


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to step the zoom of the shown image. A step that arrives while the image is
   * changing is dropped: it would zoom an image the user is no longer looking at.
   */
  const stepZoom = (
    dir: number, { limitToFit = false }: { limitToFit?: boolean } = {},
  ): void => {
    if (enableInteractions && isZoomEnabled && (shownImage.id !== null)) {
      imageDataDispatch(zoomInOut(shownImage.id, dir, limitToFit));
    }
  };


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return {
    shownImage,
    zoom,
    enableInteractions,
    fadeOut: !isVisible,
    stepZoom,
  };
  //                                                                                  </editor-fold>
};
