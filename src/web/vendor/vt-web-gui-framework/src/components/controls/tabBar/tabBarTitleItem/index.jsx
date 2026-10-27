import PropTypes from 'prop-types';
import {
  memo, forwardRef, useRef, useImperativeHandle,
} from 'react';

import classNames from 'utils/classNames';

import css from './tabBarTitleItem.scss';


/**
 * Memoized React component of a default title item for the tab bar.
 */
const TabBarTitleItem = memo(forwardRef(({
  id, disabled, darkTheme, title, subTitle, onClick,
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const titleItemRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


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
        offset: titleItemRef.current.offsetTop,
        dim: titleItemRef.current.clientHeight,
      } : {
        offset: titleItemRef.current.offsetLeft,
        dim: titleItemRef.current.clientWidth,
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

  const tabBarTitleItemClasses = classNames(css.tabBarTitleItem, {
    [css.disabled]: disabled,
  });

  const titleClasses = classNames(css.title, {
    [css.typoDisabled]: disabled,
    [css.typoDarkTheme]: darkTheme,
  });

  const subTitleClasses = classNames(css.subTitle, {
    [css.typoDisabled]: disabled,
    [css.typoDarkTheme]: darkTheme,
  });

  return (
    <div
      ref={titleItemRef}
      role="tab"
      aria-disabled={disabled}
      className={tabBarTitleItemClasses}
      {...(!disabled && {
        tabIndex: 0,
        onClick: handleClick,
      })}
    >
      <span className={titleClasses}>{title}</span>
      {(subTitle !== TabBarTitleItem.defaultProps.subTitle) && <span className={subTitleClasses}>{subTitle}</span>}
    </div>
  );
  //                                                                                  </editor-fold>
}));

TabBarTitleItem.displayName = 'TabBarTitleItem';

TabBarTitleItem.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  disabled: PropTypes.bool,
  darkTheme: PropTypes.bool,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  subTitle: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onClick: PropTypes.func,
};

TabBarTitleItem.defaultProps = {
  disabled: false,
  darkTheme: false,
  title: '',
  subTitle: '',
  onClick() {},
};

export default TabBarTitleItem;
