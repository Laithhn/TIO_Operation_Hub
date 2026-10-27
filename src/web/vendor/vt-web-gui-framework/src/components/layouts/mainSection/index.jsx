import PropTypes from 'prop-types';
import {
  forwardRef, useContext, useRef, useImperativeHandle,
} from 'react';

import Scrolling from 'components/helpers/scrolling';
import ContextScope from 'components/contexts/contextScope';
import useStylingProps from 'components/hooks/useStylingProps';
import useDimensions from 'components/hooks/useDimensions';
import classNames from 'utils/classNames';

import css from './mainSection.scss';
import stylingProps from './stylingProps';


/**
 * React component of the main section for dashboards contents of VtWebGuiFramework.
 */
const MainSection = forwardRef(({
  htmlId, noPaddingStart, noPaddingEnd, noPaddingTop, noPaddingBottom, scrollBarV, scrollBarH,
  enableScrollingKeys, children, ...restProps
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const {
    isScopeModwin, isScopeSecondSidebar, callerId, isContentRestored,
  } = useContext(ContextScope);

  const mainSectionRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isFunction = (typeof children === 'function');

  const { clientWidth, clientHeight } = useDimensions(mainSectionRef, { disabled: !isFunction });
  const { innerElemStyle } = useStylingProps(restProps, stylingProps);
  const inModwin = isScopeModwin;
  const inSecondSidebar = !inModwin && isScopeSecondSidebar;
  const inMainScope = !inModwin && !inSecondSidebar;

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


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    getBoundingClientRect: () => mainSectionRef.current.getBoundingClientRect(),
  }), []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const mainSectionClasses = classNames(css.mainSection, {
    [css.inModwin]: inModwin,
    [css.inSecondSidebar]: inSecondSidebar,
    [css.scrollBarH]: scrollBarH,
    [css.noPaddingStart]: noPaddingStart,
    [css.noPaddingEnd]: noPaddingEnd,
    [css.noPaddingTop]: noPaddingTop,
    [css.noPaddingBottom]: noPaddingBottom,
  });

  content = (
    <div
      ref={mainSectionRef}
      {...((process.env.NODE_ENV === 'development') && { id: htmlId })}
      className={mainSectionClasses}
      style={innerElemStyle}
    >
      {content}
    </div>
  );

  // main section with scoll bar
  if ((scrollBarV || scrollBarH)) {
    return (
      <Scrolling
        {...(inMainScope && { id: callerId })}
        vertical={scrollBarV}
        horizontal={scrollBarH}
        enableKeys={enableScrollingKeys}
        restoreLastPosition={inMainScope && isContentRestored}
      >
        {content}
      </Scrolling>
    );
  }

  // main section without scroll bar
  return content;
  //                                                                                  </editor-fold>
});

MainSection.displayName = 'MainSection';

MainSection.propTypes = {
  htmlId: PropTypes.string,
  noPaddingStart: PropTypes.bool,
  noPaddingEnd: PropTypes.bool,
  noPaddingTop: PropTypes.bool,
  noPaddingBottom: PropTypes.bool,
  scrollBarV: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
  scrollBarH: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
  enableScrollingKeys: PropTypes.bool,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
};

MainSection.defaultProps = {
  htmlId: null,
  noPaddingStart: false,
  noPaddingEnd: false,
  noPaddingTop: false,
  noPaddingBottom: false,
  scrollBarV: false,
  scrollBarH: false,
  enableScrollingKeys: false,
  children: null,
};

export default MainSection;
