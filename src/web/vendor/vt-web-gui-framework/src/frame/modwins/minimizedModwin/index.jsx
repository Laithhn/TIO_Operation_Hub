import PropTypes from 'prop-types';
import { memo, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import WindowControlButton, { WindowControlButtonType } from 'frame/windowControlButton';
import useDrag from 'components/hooks/useDrag';
import { actions, selectors } from 'store';

import css from './minimizedModwin.scss';


/**
 *
 */
const MinimizedModwin = memo(({
  id, initialLeft, initialBottom, onSetPositions, onClose,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { title, unclosable } = useSelector((state) => selectors.modwins.getModwinById(state, id));

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
    onDrag: useCallback((pointerPosX, pointerPosY, pointerDiffX, pointerDiffY) => {
      setPositions((prevPositions) => ({
        left: prevPositions.left + pointerDiffX,
        bottom: prevPositions.bottom - pointerDiffY,
      }));
    }, []),
    onStopDragging: useCallback(() => {
      onSetPositions(id, left, bottom);
    }, [id, onSetPositions, left, bottom]),
  });


  /**
   *
   */
  const handleMaximize = useCallback(() => {
    dispatch(actions.modwins.maximize(id));
  }, [id, dispatch]);


  /**
   *
   */
  const handleClose = useCallback(() => {
    onClose(id);
  }, [id, onClose]);


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
        <WindowControlButton
          type={WindowControlButtonType.MAXIMIZE}
          onClick={handleMaximize}
        />
        {!unclosable && (
          <WindowControlButton
            type={WindowControlButtonType.CLOSE}
            onClick={handleClose}
          />
        )}
      </div>
    </div>
  );
  //                                                                                  </editor-fold>
});

MinimizedModwin.displayName = 'MinimizedModwin';

MinimizedModwin.propTypes = {
  id: PropTypes.string.isRequired,
  initialLeft: PropTypes.number,
  initialBottom: PropTypes.number,
  onSetPositions: PropTypes.func,
  onClose: PropTypes.func,
};

MinimizedModwin.defaultProps = {
  initialLeft: 0,
  initialBottom: 0,
  onSetPositions() {},
  onClose() {},
};

export default MinimizedModwin;
