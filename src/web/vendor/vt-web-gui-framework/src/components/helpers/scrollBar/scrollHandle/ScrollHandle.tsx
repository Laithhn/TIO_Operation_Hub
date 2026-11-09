import { classNames } from 'utils/classNames';

import { InnerScrollHandle } from './innerScrollHandle/InnerScrollHandle';
import * as css from './scrollHandle.scss';
import type { ScrollHandleProps } from './scrollHandle.types';


/**
 * React sub-component of the helper component "ScrollBar".
 */
const ScrollHandle = ({
  dir, dim, pos, handleOutside, smoothScrolling, status, onPointerDown, onPointerEnter,
  onPointerLeave,
}: ScrollHandleProps) => {
  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isVertical = (dir !== 'horizontal');


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const scrollHandleClasses = classNames(css.scrollHandle, {
    [css.verticalStart]: (dir === 'verticalStart'),
    [css.verticalEnd]: isVertical && (dir !== 'verticalStart'),
    [css.horizontal]: !isVertical,
    [css.outside]: handleOutside,
    [css.smoothScrolling]: smoothScrolling,
  });

  const scrollHandleStyle: React.CSSProperties = isVertical
    ? { height: `${dim}px`, transform: `translateY(${pos}px)` }
    : { width: `${dim}px`, transform: `translateX(${pos}px)` };

  return (
    <div
      className={scrollHandleClasses}
      style={scrollHandleStyle}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <InnerScrollHandle vertical={isVertical} status={status} />
    </div>
  );
  //                                                                                  </editor-fold>
};

ScrollHandle.displayName = 'ScrollHandle';


export { ScrollHandle };
