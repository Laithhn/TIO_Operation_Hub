import { useContext, useImperativeHandle, useRef } from 'react';

import { ContentContext } from 'app/modules/content';
import { Scrolling, type ScrollingHandle } from 'components/helpers/scrolling';
import { useDimensions } from 'components/hooks/useDimensions';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';

import * as css from './mainSection.scss';
import { type MainSectionProps, mainSectionStylingProps } from './mainSection.types';


/**
 * React component of the layout component "MainSection", the main section for dashboard contents of
 * VtWebGuiFramework.
 */
const MainSection = ({
  ref, noPaddingStart = false, noPaddingEnd = false, noPaddingTop = false,
  noPaddingBottom = false, scrollBarV = false, scrollBarH = false, enableScrollingKeys = false,
  children, ...restProps
}: MainSectionProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const {
    isScopeModwin, isScopeSecondSidebar, callerId, isContentRestored,
  } = useContext(ContentContext);

  const mainSectionElemRef = useRef<HTMLDivElement>(null);
  const scrollingHandleRef = useRef<ScrollingHandle>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isFunction = (typeof children === 'function');
  const isScrolling = (scrollBarV || scrollBarH);

  const { clientWidth, clientHeight } = useDimensions({
    ref: isScrolling ? scrollingHandleRef : mainSectionElemRef,
    disable: !isFunction,
  });
  const { innerElemStyle } = useStylingProps(restProps, mainSectionStylingProps);
  const isMainScope = !isScopeModwin && !isScopeSecondSidebar;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    clientLeft: mainSectionElemRef.current?.clientLeft,
    clientWidth: mainSectionElemRef.current?.clientWidth,
    clientTop: mainSectionElemRef.current?.clientTop,
    clientHeight: mainSectionElemRef.current?.clientHeight,
    getBoundingClientRect: () => mainSectionElemRef.current?.getBoundingClientRect(),
    contains: (other: Node | null) => mainSectionElemRef.current?.contains(other),
    ...scrollingHandleRef.current,
  }), []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  let content;

  if (isFunction) {
    content = (clientWidth && clientHeight
      ? children({
        width: clientWidth,
        height: clientHeight,
      })
      : null
    );
  } else {
    content = children;
  }

  const mainSectionClasses = classNames(css.mainSection, {
    [css.inModwin]: isScopeModwin,
    [css.inSecondSidebar]: !isScopeModwin && isScopeSecondSidebar,
    [css.scrollBarH]: scrollBarH,
    [css.noPaddingStart]: noPaddingStart,
    [css.noPaddingEnd]: noPaddingEnd,
    [css.noPaddingTop]: noPaddingTop,
    [css.noPaddingBottom]: noPaddingBottom,
  });

  // main section with scoll bar
  if (isScrolling) {
    return (
      <Scrolling
        ref={scrollingHandleRef}
        {...(callerId && !isScopeSecondSidebar && { id: `viwgf_${isScopeModwin ? 'modwin' : 'mainScope'}_${callerId}` })}
        vertical={scrollBarV}
        horizontal={scrollBarH}
        enableKeys={enableScrollingKeys}
        restoreLastPosition={isMainScope && isContentRestored} // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
      >
        <div className={mainSectionClasses} style={innerElemStyle}>
          {content}
        </div>
      </Scrolling>
    );
  }

  // main section without scroll bar
  return (
    <div ref={mainSectionElemRef} className={mainSectionClasses} style={innerElemStyle}>
      {content}
    </div>
  );
  //                                                                                  </editor-fold>
};

MainSection.displayName = 'MainSection';


export { MainSection };
