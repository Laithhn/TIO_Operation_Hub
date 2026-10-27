import { useState } from 'react';

import { WindowControlButton } from 'app/modules/windowControlButton';
import { useDispatch } from 'components/hooks/useDispatch';
import { useDrag } from 'components/hooks/useDrag';
import { useSelector } from 'components/hooks/useSelector';

import { maximize, selectModwin } from '../modwins.slice';

import * as css from './minimizedModwin.scss';
import type { MinimizedModwinProps } from './minimizedModwin.types';


/**
 *
 */
const MinimizedModwin = ({
  id, initialLeft, initialBottom, onSetPositions, onClose,
}: MinimizedModwinProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { title, isUnclosable } = useSelector((state) => selectModwin(state, id)!);

  const [{ left, bottom }, setPositions] = useState({ left: initialLeft, bottom: initialBottom });


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const { dragProps } = useDrag({
    rangeX: [0, document.documentElement.clientWidth],
    rangeY: [0, document.documentElement.clientHeight],
    onDrag: ({ diffX, diffY }) => {
      setPositions((prevPositions) => ({
        left: prevPositions.left + diffX,
        bottom: prevPositions.bottom - diffY,
      }));
    },
    onStopDragging: () => {
      onSetPositions({ id, left, bottom });
    },
  });


  /**
   *
   */
  const handleMaximize = () => {
    dispatch(maximize(id));
  };


  /**
   *
   */
  const handleClose = () => {
    onClose(id);
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const minimizedWindowStyle = {
    left: `${left}px`,
    bottom: `${bottom}px`,
  };

  return (
    <div
      className={css.minimizedModwin}
      style={minimizedWindowStyle}
      {...dragProps}
    >
      <div className={css.title}>{title}</div>
      <div className={css.buttons}>
        <WindowControlButton type="maximize" onClick={handleMaximize} />
        {!isUnclosable && (
          <WindowControlButton type="close" onClick={handleClose} />
        )}
      </div>
    </div>
  );
  //                                                                                  </editor-fold>
};

MinimizedModwin.displayName = 'MinimizedModwin';


export { MinimizedModwin };
