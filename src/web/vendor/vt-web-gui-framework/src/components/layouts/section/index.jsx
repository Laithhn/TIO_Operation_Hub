import PropTypes from 'prop-types';
import { forwardRef, useRef, useImperativeHandle } from 'react';

import Scrolling from 'components/helpers/scrolling';
import useStylingProps from 'components/hooks/useStylingProps';
import useDimensions from 'components/hooks/useDimensions';
import classNames from 'utils/classNames';

import css from './section.scss';
import stylingProps from './stylingProps';


/**
 * React component of a universal structuring section for dashboards contents of VtWebGuiFramework.
 */
const Section = forwardRef(({
  id, htmlId, scrollBarV, scrollBarH, enableScrollingKeys, onClick, children, ...restProps
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const sectionRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const withScrollbar = (scrollBarV || scrollBarH);
  const isFunction = (typeof children === 'function');

  const { clientWidth, clientHeight } = useDimensions(sectionRef, { disabled: !isFunction });
  const {
    outerElemStyle, innerElemStyle, elemStyle, hasDarkBackground,
  } = useStylingProps(restProps, stylingProps, { addCombinedStyle: !withScrollbar });

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
    getBoundingClientRect: () => sectionRef.current.getBoundingClientRect(),
  }), []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const sectionClasses = classNames(css.section, {
    [css.darkTheme]: hasDarkBackground,
    [css.overflowHidden]: isFunction,
    [css.clickable]: !!onClick,
  });

  // Section with scoll bar.
  if (withScrollbar) {
    return (
      <Scrolling
        style={outerElemStyle}
        vertical={scrollBarV}
        horizontal={scrollBarH}
        enableKeys={enableScrollingKeys}
      >
        <div
          {...((process.env.NODE_ENV === 'development') && { id: htmlId })}
          ref={sectionRef}
          className={sectionClasses}
          style={innerElemStyle}
          {...(onClick && { onClick: (event) => onClick(id, event) })}
        >
          {content}
        </div>
      </Scrolling>
    );
  }

  // Section without scroll bar.
  return (
    <div
      {...((process.env.NODE_ENV === 'development') && { id: htmlId })}
      ref={sectionRef}
      className={sectionClasses}
      style={elemStyle}
      {...(onClick && { onClick: (event) => onClick(id, event) })}
    >
      {content}
    </div>
  );
  //                                                                                  </editor-fold>
});

Section.displayName = 'Section';

Section.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  htmlId: PropTypes.string,
  scrollBarV: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
  scrollBarH: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
  enableScrollingKeys: PropTypes.bool,
  onClick: PropTypes.func,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
};

Section.defaultProps = {
  id: '',
  htmlId: null,
  scrollBarV: false,
  scrollBarH: false,
  enableScrollingKeys: false,
  onClick: null,
  children: null,
};

export default Section;
