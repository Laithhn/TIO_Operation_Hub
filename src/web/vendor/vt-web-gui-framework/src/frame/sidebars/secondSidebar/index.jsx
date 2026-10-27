import { memo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { ResizeHandle } from 'components/helpers/resizer';
import useDrag from 'components/hooks/useDrag';
import { actions, selectors } from 'store';

import css from './secondSidebar.scss';
import ContentScope from './contentScope';
import Toolbar from './toolbar';


/**
 *
 */
const SecondSidebar = memo(() => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const isRtl = useSelector(selectors.i18n.isCurrentLanguageRtl);
  const width = useSelector(selectors.sidebars.secondSidebar.getWidth);
  const isMinimized = useSelector(selectors.sidebars.secondSidebar.isMinimized);
  const isResizable = useSelector(selectors.sidebars.secondSidebar.isResizable);
  const contentPath = useSelector(selectors.sidebars.secondSidebar.getContentPath);


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

  const { dragProps: { onPointerDown: handlePointerDown } } = useDrag({
    rangeX: isRtl
      ? [0, (document.documentElement.clientWidth / 2)]
      : [(document.documentElement.clientWidth / 2), document.documentElement.clientWidth],
    onDrag: useCallback((pointerPosX, pointerPosY, pointerDiffX) => {
      dispatch(actions.sidebars.secondSidebar.setWidth(
        isRtl ? width + pointerDiffX : width - pointerDiffX,
      ));
    }, [isRtl, width, dispatch]),
  });


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <div
      className={css.secondSidebar}
      style={{ width: `${width}px` }}
    >
      <Toolbar />
      <ContentScope contentPath={contentPath} />
      {isResizable && !isMinimized && (
        <ResizeHandle
          placement={isRtl ? 'right' : 'left'}
          onPointerDown={handlePointerDown}
        />
      )}
    </div>
  );
  //                                                                                  </editor-fold>
});

SecondSidebar.displayName = 'SecondSidebar';

export default SecondSidebar;
