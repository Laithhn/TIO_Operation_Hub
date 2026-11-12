import { useRef, useState } from 'react';

import { selectViewportHeight, selectViewportWidth } from 'app/app.slice';
import type { ContentHandle } from 'app/modules/content';
import { layout } from 'assets/styles';
import { useDispatch } from 'components/hooks/useDispatch';
import { useSelector } from 'components/hooks/useSelector';

import { MinimizedModwin } from './minimizedModwin/MinimizedModwin';
import type { MinimizedModwinProps } from './minimizedModwin/minimizedModwin.types';
import { Modwin } from './modwin/Modwin';
import { deleteModwin, selectAllIds, selectIdsOfMinimizedModwins } from './modwins.slice';


const spaceL = layout.modwins.spaceLeftRight;
const halfSpaceL = spaceL / 2;
const spaceB = layout.modwins.spaceBottom;
const halfSpaceB = spaceB / 2;
const miniWidth = layout.modwins.minimizedModwinWidth;
const miniExtWidth = miniWidth + spaceL;
const miniHeight = layout.modwins.minimizedModwinHeight;
const miniExtHeight = miniHeight + spaceB;


/**
 * React component as container of all loaded modal windows.
 */
const Modwins = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const viewportWidth = useSelector(selectViewportWidth);
  const viewportHeight = useSelector(selectViewportHeight);
  const minimizedModwinIds = useSelector(selectIdsOfMinimizedModwins);
  const allModwinIds = useSelector(selectAllIds);

  const [fixMiniPositions, setFixMiniPositions] = useState<Record<string, { left: number; bottom: number }>>({});

  const contentRef = useRef<ContentHandle>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  /**
   * Helper function to derive the occupied places for the minimized modwins by the IDs of the
   * minimized modal windows and their stored positions.
   */
  const deriveAllMiniPositions = () => {
    const occupiedPlaces = minimizedModwinIds.filter((id) => fixMiniPositions[id]).reduce<Record<number, number[]>>((acc, id) => {
      const { left, bottom } = fixMiniPositions[id]!;

      const fromRow = Math.floor((bottom - halfSpaceB) / miniExtHeight);
      const untilRow = Math.ceil(((bottom + miniHeight + halfSpaceB) / miniExtHeight) - 1);
      const fromCol = Math.floor((left - halfSpaceL) / miniExtWidth);
      const untilCol = Math.ceil(((left + miniWidth - halfSpaceL) / miniExtWidth) - 1);

      return {
        ...acc,
        [fromRow]: [...(acc[fromRow] ?? []), fromCol, untilCol],
        [untilRow]: [...(acc[untilRow] ?? []), fromCol, untilCol],
      };
    }, {});

    const maxNumRows = Math.floor((viewportHeight - spaceB) / miniExtHeight);
    const maxNumCols = Math.floor((viewportWidth - spaceL) / miniExtWidth);
    const ret: typeof fixMiniPositions = {};
    let startRow = 0,
      startCol = 0;

    for (const id of minimizedModwinIds) {
      let pos;

      if (fixMiniPositions[id]) {
        pos = { ...fixMiniPositions[id] };
      } else {
        for (let row = startRow; !pos && (row < maxNumRows); row++) {
          for (let col = startCol; col < maxNumCols; col++) {
            if (!occupiedPlaces[row]?.includes(col)) {
              startCol = col + 1;

              if (startCol === maxNumCols) {
                startRow = row + 1;
                startCol = 0;
              } else {
                startRow = row;
              }

              pos = {
                left: (spaceL + (col * miniExtWidth)),
                bottom: (spaceB + (row * miniExtHeight)),
              };
              break;
            }
          }
        }

        pos ??= { left: spaceL, bottom: spaceB };
      }

      ret[id] = pos;
    }

    return ret;
  };


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const handleSetFixMiniPositions: MinimizedModwinProps['onSetPositions'] = ({ id, left, bottom }) => {
    setFixMiniPositions((prevValue) => ({
      ...prevValue,
      [id]: { left, bottom },
    }));
  };


  /**
   *
   */
  const handleClose = (id: string) => {
    if (
      !contentRef.current
      || !('beforeUnload' in contentRef.current)
      || contentRef.current.beforeUnload(id)
    ) {
      dispatch(deleteModwin(id));
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const allMiniPositions = deriveAllMiniPositions();

  return (
    <>
      {minimizedModwinIds.map((id) => (
        <MinimizedModwin
          key={id}
          id={id}
          initialLeft={allMiniPositions[id]!.left}
          initialBottom={allMiniPositions[id]!.bottom}
          onSetPositions={handleSetFixMiniPositions}
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
};

Modwins.displayName = 'Modwins';


export { Modwins };
