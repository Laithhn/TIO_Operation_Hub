import PropTypes from 'prop-types';
import { forwardRef, useRef, useImperativeHandle } from 'react';

import Enums from 'assets/enums';
import useStylingProps from 'components/hooks/useStylingProps';
import classNames from 'utils/classNames';

import { TabularStyle } from '../enums';
import stylingProps from './stylingProps';
import css from './tabularContrItem.scss';


/**
 * React component of an individual tabular container item, that can be used as child of component
 * Tabular.
 */
const TabularContrItem = forwardRef(({
  tabularStyle, paddingTopBottom, paddingLeftRight, children, ...restProps
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const tabularContrItemRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { innerElemStyle } = useStylingProps(restProps, stylingProps);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    getBoundingClientRect: () => tabularContrItemRef.current.getBoundingClientRect(),
  }), []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const tabularContrItemClasses = classNames(css.tabularContrItem, {
    [css.tabularStyleIsLine]: (tabularStyle === TabularStyle.LINE),
    [css.tabularStyleIsBackground]: (tabularStyle === TabularStyle.BACKGROUND),
  });

  const tabularContrItemStyle = {
    ...innerElemStyle,
    padding: `${paddingTopBottom.cssValue} ${paddingLeftRight.cssValue}`,
  };

  return (
    <div
      ref={tabularContrItemRef}
      className={tabularContrItemClasses}
      style={tabularContrItemStyle}
    >
      {children}
    </div>
  );
  //                                                                                  </editor-fold>
});

TabularContrItem.displayName = 'TabularContrItem';

TabularContrItem.propTypes = {
  tabularStyle: PropTypes.instanceOf(TabularStyle), // from Tabular
  paddingTopBottom: PropTypes.instanceOf(Enums.GapAndPadding), // from Tabular
  paddingLeftRight: PropTypes.instanceOf(Enums.GapAndPadding), // from Tabular
  children: PropTypes.node,
};

TabularContrItem.defaultProps = {
  tabularStyle: TabularStyle.LINE,
  paddingTopBottom: Enums.GapAndPadding.NONE,
  paddingLeftRight: Enums.GapAndPadding.NONE,
  children: null,
};

export default TabularContrItem;
