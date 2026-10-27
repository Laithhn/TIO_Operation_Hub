import { memo, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import defines from 'assets/defines';
import { actions, selectors } from 'store';

import MinimizedModwin from './minimizedModwin';
import Modwin from './modwin';


const spaceL = defines.layout.modwins.spaceLeftRight;
const halfSpaceL = spaceL / 2;
const spaceB = defines.layout.modwins.spaceBottom;
const halfSpaceB = spaceB / 2;
const miniWidth = defines.layout.modwins.minimizedModwinWidth;
const miniExtWidth = miniWidth + spaceL;
const miniHeight = defines.layout.modwins.minimizedModwinHeight;
const miniExtHeight = miniHeight + spaceB;


/**
 * React component as container of all loaded modal windows.
 */
const Modwins = memo(() => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const viewportWidth = useSelector(selectors.app.getViewportWidth);
  const viewportHeight = useSelector(selectors.app.getViewportHeight);
  const minimizedModwinIds = useSelector(selectors.modwins.getIdsOfMinimizedModwins);
  const allModwinIds = useSelector(selectors.modwins.getAllModwinIds);

  const contentRef = useRef();
  const miniPositionsRef = useRef({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const occupiedPlaces = {};
  const maxNumRows = Math.floor((viewportHeight - spaceB) / miniExtHeight);
  const maxNumCols = Math.floor((viewportWidth - spaceL) / miniExtWidth);

  // Calculate the occupied places for the minimized modwins by the IDs of the minimized modal
  // windows and their stored positions.
  miniPositionsRef.current = minimizedModwinIds.reduce((acc, id) => {
    if (miniPositionsRef.current[id]) {
      const { left, bottom } = miniPositionsRef.current[id];

      const fromRow = Math.floor((bottom - halfSpaceB) / miniExtHeight);
      const untilRow = Math.ceil(((bottom + miniHeight + halfSpaceB) / miniExtHeight) - 1);
      const fromCol = Math.floor((left - halfSpaceL) / miniExtWidth);
      const untilCol = Math.ceil(((left + miniWidth - halfSpaceL) / miniExtWidth) - 1);

      if (occupiedPlaces[fromRow]) {
        occupiedPlaces[fromRow].push(fromCol, untilCol);
      } else {
        occupiedPlaces[fromRow] = [fromCol, untilCol];
      }

      if (occupiedPlaces[untilRow]) {
        occupiedPlaces[untilRow].push(fromCol, untilCol);
      } else {
        occupiedPlaces[untilRow] = [fromCol, untilCol];
      }
    }

    return {
      ...acc,
      [id]: miniPositionsRef.current[id] ?? null,
    };
  }, {});


  miniPositionsRef.current = Object.keys(miniPositionsRef.current).reduce((acc, id) => {
    if (miniPositionsRef.current[id]) {
      return {
        ...acc,
        [id]: miniPositionsRef.current[id],
      };
    }

    for (let row = 0; row < maxNumRows; row++) {
      for (let col = 0; col < maxNumCols; col++) {
        if (!occupiedPlaces[row] || !occupiedPlaces[row].includes(col)) {
          return {
            ...acc,
            [id]: {
              id,
              left: (spaceL + (col * miniExtWidth)),
              bottom: (spaceB + (row * miniExtHeight)),
            },
          };
        }
      }
    }

    return {
      ...acc,
      [id]: { id, left: spaceL, bottom: spaceB },
    };
  }, {});


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
  const handleSetMiniPositions = useCallback((id, left, bottom) => {
    miniPositionsRef.current[id] = { id, left, bottom };
  }, []);


  /**
   *
   */
  const handleClose = useCallback((id) => {
    if (
      (typeof contentRef.current?.beforeUnload !== 'function')
      || (contentRef.current.beforeUnload(id) !== false)
    ) {
      dispatch(actions.modwins.deleteModwin(id));
    }
  }, [dispatch]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <>
      {minimizedModwinIds.map((id) => (
        <MinimizedModwin
          key={id}
          id={id}
          initialLeft={miniPositionsRef.current[id].left}
          initialBottom={miniPositionsRef.current[id].bottom}
          onSetPositions={handleSetMiniPositions}
          onClose={handleClose}
        />
      ))}
      {allModwinIds.map((id) => (
        <Modwin
          ref={contentRef}
          key={id}
          id={id}
          onClose={handleClose}
        />
      ))}
    </>
  );
  //                                                                                  </editor-fold>
});

Modwins.displayName = 'Modwins';

export default Modwins;
