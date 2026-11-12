import { useState } from 'react';

import { deepEqual } from 'utils/deepEqual';
import { isNonEmptyString } from 'utils/type';

import type { ImageViewerImageId, ImageViewerImages } from './imageViewer.types';
import type { SelectedImage, UseImagesProps, UseImagesResult } from './useImages.types';


/**
 * Helper function to bring the three forms the prop "images" takes into one: the sources by their
 * ID, and the IDs in the order they are shown. A single source becomes the one image "0", an array
 * gives its indexes as IDs, an object its keys - and an entry that is no source is dropped, which
 * is why the IDs are read off the result rather than off the input.
 */
const getImagesById = (images: ImageViewerImages): Record<ImageViewerImageId, string> => {
  if (typeof images === 'string') {
    return isNonEmptyString(images) ? { 0: images } : {};
  }

  const entries = Array.isArray(images)
    ? images.map((src, idx) => [String(idx), src] as const)
    : Object.entries(images);

  return Object.fromEntries(entries.filter(([, src]) => isNonEmptyString(src)));
};


/**
 * Hook of the popup component "ImageViewer" holding the images it shows and which of them is
 * selected. The list is taken once and only followed where the prop "followImages" says so: a
 * viewer opened on a list is a walk through exactly those images, and one that re-read its prop
 * would jump under the hands of a user while something else deletes images in the background.
 */
export const useImages = ({
  images, startId = null, followImages = false,
}: UseImagesProps): UseImagesResult => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [shownImages, setShownImages] = useState<ImageViewerImages>(images);
  const [selected, setSelected] = useState<SelectedImage | null>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // The list follows its prop only where it is told to, and it is compared by value: a call site
  // writing its images inline hands over a new object on every render of its own, so a comparison
  // by identity would take the list over again and again.
  if (followImages && !deepEqual(images, shownImages)) {
    setShownImages(images);
  }

  const imagesById = getImagesById(shownImages);
  const allImageIds = Object.keys(imagesById);
  const selectedIdx = (selected === null) ? -1 : allImageIds.indexOf(selected.id);

  // The selection follows the list at exactly three points, and the user owns it everywhere else.
  if (selected === null) {
    // Opening: the image the prop "startId" names, and the first one where it names none.
    if (allImageIds.length > 0) {
      const openIdx = ((startId !== null) && imagesById[startId]) ? allImageIds.indexOf(startId) : 0;
      const openId = allImageIds[openIdx];

      if (openId !== undefined) {
        setSelected({ id: openId, idx: openIdx });
      }
    }
  } else if (selectedIdx < 0) {
    // The selected image is gone: the viewer steps to whatever took its place, which is the image
    // after it, or to the last one where the gone image was the last. Nothing is left to select
    // once the list is empty.
    const neighbourIdx = Math.min(selected.idx, allImageIds.length - 1);
    const neighbourId = allImageIds[neighbourIdx];

    setSelected((neighbourId === undefined) ? null : { id: neighbourId, idx: neighbourIdx });
  } else if (selectedIdx !== selected.idx) {
    // The selected image is still there but sits elsewhere now, so its place is written down anew -
    // it is what the step above needs the moment this image goes too.
    setSelected({ id: selected.id, idx: selectedIdx });
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to select the image sitting at a given place, used by the three ways out of
   * this hook. A place outside the list selects nothing, which is what keeps the two steppers at
   * the ends of the list.
   */
  const selectByIdx = (idx: number): void => {
    const id = allImageIds[idx];

    if (id !== undefined) {
      setSelected({ id, idx });
    }
  };


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return {
    imagesById,
    allImageIds,
    selectedId: selected?.id ?? null,
    selectById: (id) => {
      selectByIdx(allImageIds.indexOf(id));
    },
    selectPrevId: () => {
      selectByIdx(Math.max(0, selectedIdx - 1));
    },
    selectNextId: () => {
      selectByIdx(Math.min(allImageIds.length - 1, selectedIdx + 1));
    },
  };
  //                                                                                  </editor-fold>
};
