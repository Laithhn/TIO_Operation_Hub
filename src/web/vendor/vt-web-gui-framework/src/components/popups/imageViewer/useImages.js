import {
  useState, useRef, useMemo, useCallback, useEffect,
} from 'react';


/**
 *
 */
const useImages = (images = {}, startId = null) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [selectedId, setSelectedId] = useState(null);

  const selectedIdHistoryRef = useRef([]);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // If the given images (prop "images") change (flat comparison), derive a memoized object of it:
  // { imagesById: { [id]: string }, allImageIds: string[] }
  const { imagesById, allImageIds } = useMemo(() => {
    let byId = {};

    if ((typeof images === 'string') && (images !== '')) {
      // if a single image source is given, build an object of it
      byId = { 0: images };
    } else if (Array.isArray(images)) {
      // if images are given as an array of source strings, take the indexes of the array as keys
      byId = images.reduce((acc, src, idx) => (((typeof src === 'string') && (src !== ''))
        ? { ...acc, [idx]: src }
        : acc
      ), {});
    } else if (typeof images === 'object') {
      // if the images are given as an object, rebuild the object with valid source strings
      byId = Object.keys(images).reduce((acc, id) => {
        const src = images[id];

        return ((typeof src === 'string') && (src !== ''))
          ? { ...acc, [id]: src }
          : acc;
      }, {});
    }

    return {
      imagesById: byId,
      allImageIds: Object.keys(byId),
    };
  }, [images]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Memoized helper function to select the image previous to the current one.
   */
  const selectPrevId = useCallback(() => {
    setSelectedId(allImageIds[Math.max(0, (allImageIds.indexOf(selectedId ?? '') - 1))]);
  }, [selectedId, allImageIds]);


  /**
   * Memoized helper function to select the image next to the current one.
   */
  const selectNextId = useCallback(() => {
    setSelectedId(allImageIds[Math.min((allImageIds.length - 1), (allImageIds.indexOf(selectedId ?? '') + 1))]);
  }, [selectedId, allImageIds]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    setSelectedId((prevId) => {
      let nextId = prevId;

      if (prevId === null) {
        // If there is no selected ID, try to take the given start-ID or the ID of the first image.
        // The selected ID is only null at the beginning or after all images have been deleted.

        if (imagesById[startId]) {
          nextId = startId;
        } else if (allImageIds.length > 0) {
          [nextId] = allImageIds;
        }
      } else if (!imagesById[prevId]) {
        // If the currently selected ID is no longer valid (e.g. because the respective image has been
        // deleted in the meantime), take the last ID from the history.

        nextId = selectedIdHistoryRef.current.toReversed().find((id) => imagesById[id])
          ?? allImageIds[0]
          ?? null;
      }

      if (nextId === prevId) {
        return prevId;
      }

      if (nextId !== null) {
        selectedIdHistoryRef.current.push(nextId);
      }

      return nextId;
    });
  }, [startId, imagesById, allImageIds]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return {
    imagesById,
    allImageIds,
    selectedId,
    selectById: setSelectedId,
    selectPrevId,
    selectNextId,
  };
  //                                                                                  </editor-fold>
};

export default useImages;
