import { classNames } from 'utils/classNames';

import * as css from './scrollWay.scss';
import type { ScrollWayProps } from './scrollWay.types';


/**
 * React sub-component of the helper component "ScrollBar".
 */
const ScrollWay = ({
  dir, isRtl, posStart, posEnd, handleOutside, status, onPointerEnter, onPointerLeave,
  onPointerDownAtPos,
}: ScrollWayProps) => {
  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isVertical = (dir !== 'horizontal');
  let scrollWayStyle: React.CSSProperties;

  if (isVertical) {
    scrollWayStyle = { top: `${posStart}px`, bottom: `${posEnd}px` };
  } else if (isRtl) {
    scrollWayStyle = { left: `${posEnd}px`, right: `${posStart}px` };
  } else {
    scrollWayStyle = { left: `${posStart}px`, right: `${posEnd}px` };
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the synthetic React event "onPointerDown" of the native main element of the scroll
   * way to propagate the relative position from the start of the scroll way to the pointer down
   * position.
   */
  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    const { top, left, right } = event.currentTarget.getBoundingClientRect();
    let pos;

    event.preventDefault(); // if not doing this, text selection will be enabled at pointer move

    if (isVertical) {
      pos = event.clientY - top;
    } else {
      pos = isRtl ? (right - event.clientX) : (event.clientX - left);
    }

    onPointerDownAtPos({ pos, event });
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const scrollWayClasses = classNames(css.scrollWay, {
    [css.verticalStart]: (dir === 'verticalStart'),
    [css.verticalEnd]: isVertical && (dir !== 'verticalStart'),
    [css.horizontal]: !isVertical,
    [css.hover]: (status === 'hover'),
    [css.outside]: handleOutside,
  });

  return (
    <div
      className={scrollWayClasses}
      style={scrollWayStyle}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    />
  );
  //                                                                                  </editor-fold>
};

ScrollWay.displayName = 'ScrollWay';


export { ScrollWay };
