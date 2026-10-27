import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';

import { ScrollBar, type ScrollBarProps } from 'components/helpers/scrollBar';
import { useFadeInOut } from 'components/hooks/useFadeInOut';
import { useScrollHandlers } from 'components/hooks/useScrollHandlers';
import { useSelector } from 'components/hooks/useSelector';
import { primaryMenuSlice } from 'store/menus/primaryMenu';
import { classNames } from 'utils/classNames';
import { scrollTopDiff, scrollTopTo } from 'utils/scroll';

import * as css from './megaMenu.scss';
import type { MegaMenuProps } from './megaMenu.types';
import { MenuGroup } from './menuGroup/MenuGroup';


const defaultDims = {
  clientHeight: 0,
  scrollHeight: 0,
  scrollTop: 0,
};

const addBorderHeight = 2;

const portalCntr = document.getElementById(process.env['ELEM_ID_TEMP'] ?? '');

// The duration of the menu's animation, which its stylesheet hands over as a string - the only type
// css-loader knows for an exported value - and which the fade and the timeout below need as a number.
const animationTimeMs = Number(css.animationTimeMs);


/**
 * React sub-component of the app module "Header" to render the mega menu with the primary submenus
 * of a primary menu node, given by its ID.
 */
const MegaMenu = ({
  ref, menuNodeId, show, onClose,
}: MegaMenuProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const submenuNodes = useSelector((state) => primaryMenuSlice.selectVisibleSubmenuNodes(state, menuNodeId ?? '')) ?? [];

  const [dims, setDims] = useState(defaultDims);
  const [showScrollBar, setShowScrollBar] = useState(false);

  const innerCntrRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevsRef = useRef<{ menuNodeId?: typeof menuNodeId }>({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to set the dimensions of the given container to the internal
   * state.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const deriveDims = useCallback(() => {
    setDims((prevDims) => {
      const { clientHeight, scrollHeight, scrollTop } = innerCntrRef.current ?? defaultDims;

      return (
        (clientHeight === prevDims.clientHeight)
        && (scrollHeight === prevDims.scrollHeight)
        && (scrollTop === prevDims.scrollTop)
      )
        ? prevDims
        : { clientHeight, scrollHeight, scrollTop };
    });
  }, []);


  /**
   * Helper function to overtake the current values of scrollTop from the
   * scrolling container to the internal state, if it changes.
   */
  const setScrollPosition = () => {
    setDims((prevValue) => {
      const { scrollTop } = innerCntrRef.current ?? {};

      return ((typeof scrollTop === 'number') && (scrollTop !== prevValue.scrollTop))
        ? { ...prevValue, scrollTop }
        : prevValue;
    });
  };


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const scrollHandlersProps = useScrollHandlers<HTMLDivElement>({
    enableWheel: true,
    enableTouch: true,
    onChangeY: ({ diff }) => {
      if (innerCntrRef.current) {
        scrollTopDiff(innerCntrRef.current, diff, {
          callback: setScrollPosition,
        });
      }
    },
  });


  /**
   * Handler for the callback prop "onScroll" of the scroll bar to scroll vertical by moving the
   * scroll bar handle.
   */
  const handleScroll: NonNullable<ScrollBarProps['onScroll']> = ({ scrollPos, event }) => {
    if (innerCntrRef.current) {
      scrollTopTo(innerCntrRef.current, scrollPos, {
        ...((event.type !== 'pointerdown') && { duration: 0 }),
        easing: 'easeInOutQuad',
        callback: setScrollPosition,
      });
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  const { visibility } = useFadeInOut({
    show,
    fadeInTimeMs: animationTimeMs,
    fadeOutTimeMs: animationTimeMs,
  });


  useEffect(() => {
    if (menuNodeId && (menuNodeId !== prevsRef.current.menuNodeId)) {
      setDims((prevValue) => (
        (prevValue.scrollTop !== 0) ? { ...prevValue, scrollTop: 0 } : prevValue
      ));

      setShowScrollBar(false);
      timeoutRef.current = setTimeout(() => {
        deriveDims();
        setShowScrollBar(true);
      }, animationTimeMs * 1.2);

      prevsRef.current.menuNodeId = menuNodeId;

      return () => {
        clearTimeout(timeoutRef.current);
      };
    }

    return undefined;
  }, [menuNodeId, deriveDims]);


  useEffect(() => {
    document.addEventListener('domChange', deriveDims);
    deriveDims();

    return () => {
      document.removeEventListener('domChange', deriveDims);
    };
  }, [deriveDims]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if ((visibility === 'hide') || !portalCntr) {
    return null;
  }


  const megaMenuClasses = classNames(css.megaMenu, {
    [css.show]: (visibility === 'fadeIn') || (visibility === 'show'),
  });

  const megaMenuStyle = {
    ...(dims.scrollHeight && { height: `${dims.scrollHeight + addBorderHeight}px` }),
  };

  return createPortal(
    <div className={css.outerContr}>
      <div
        ref={ref}
        className={megaMenuClasses}
        style={megaMenuStyle}
      >
        <div
          ref={innerCntrRef}
          className={css.innerContr}
          {...scrollHandlersProps}
        >
          {submenuNodes.map((menuNode) => (
            <MenuGroup key={menuNode.id} menuNode={menuNode} onClose={onClose} />
          ))}
        </div>
        {/* eslint-disable-next-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908 */}
        {showScrollBar && (
          <ScrollBar
            dimVisible={dims.clientHeight}
            dimTotal={dims.scrollHeight}
            scrollOffset={dims.scrollTop}
            onScroll={handleScroll}
          />
        )}
      </div>
    </div>,
    portalCntr,
  );
  //                                                                                  </editor-fold>
};

MegaMenu.displayName = 'MegaMenu';


export { MegaMenu };
