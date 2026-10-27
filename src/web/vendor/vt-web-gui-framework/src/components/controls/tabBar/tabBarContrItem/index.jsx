import PropTypes from 'prop-types';
import {
  forwardRef, useRef, useImperativeHandle,
} from 'react';

import useStylingProps from 'components/hooks/useStylingProps';
import classNames from 'utils/classNames';

import stylingProps from './stylingProps';
import css from './tabBarContrItem.scss';


/**
 * React component of a container item for the tab bar.
 */
const TabBarContrItem = forwardRef(({
  id, disabled, onClick, children, ...restProps
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const contrItemRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { elemStyle } = useStylingProps(restProps, stylingProps, { addCombinedStyle: true });


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    getPosition: (isVertical) => (
      isVertical ? {
        offset: contrItemRef.current.offsetTop,
        dim: contrItemRef.current.clientHeight,
      } : {
        offset: contrItemRef.current.offsetLeft,
        dim: contrItemRef.current.clientWidth,
      }),
  }), []);


  /**
   * Handler for event "click" on the tab bar item.
   */
  const handleClick = (event) => {
    onClick(id, event);
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const tabBarContrItemClasses = classNames(css.tabBarContrItem, {
    [css.disabled]: disabled,
  });

  return (
    <div
      ref={contrItemRef}
      role="tab"
      aria-disabled={disabled}
      className={tabBarContrItemClasses}
      style={elemStyle}
      {...(!disabled && {
        tabIndex: 0,
        onClick: handleClick,
      })}
    >
      {children}
    </div>
  );
  //                                                                                  </editor-fold>
});

TabBarContrItem.displayName = 'TabBarContrItem';

TabBarContrItem.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  children: PropTypes.node,
};

TabBarContrItem.defaultProps = {
  disabled: false,
  onClick() {},
  children: null,
};

export default TabBarContrItem;
