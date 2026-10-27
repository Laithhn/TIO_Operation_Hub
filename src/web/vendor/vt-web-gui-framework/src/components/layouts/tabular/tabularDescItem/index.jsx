import PropTypes from 'prop-types';
import { memo } from 'react';

import Enums from 'assets/enums';
import classNames from 'utils/classNames';

import { TabularStyle } from '../enums';
import css from './tabularDescItem.scss';


/**
 * Memoized React component of a tabular description item, that can be used as child of component
 * Tabular. Note that it is only memoized, if the given children is a string or number.
 */
const TabularDescItem = memo(({
  tabularStyle, paddingLeftRight, spaceBefore, spaceAfter, children,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


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


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const tabularDescItemClasses = classNames(css.tabularDescItem, {
    [css.tabularStyleIsLine]: (tabularStyle === TabularStyle.LINE),
    [css.spaceBefore]: spaceBefore,
    [css.spaceAfter]: spaceAfter,
  });

  const tabularDescItemStyle = (tabularStyle === TabularStyle.LINE)
    ? {
      paddingRight: paddingLeftRight.cssValue,
      paddingLeft: paddingLeftRight.cssValue,
    } : {};

  return (
    <div className={tabularDescItemClasses} style={tabularDescItemStyle}>
      {children}
    </div>
  );
  //                                                                                  </editor-fold>
});

TabularDescItem.displayName = 'TabularDescItem';

TabularDescItem.propTypes = {
  tabularStyle: PropTypes.instanceOf(TabularStyle), // from Tabular
  paddingLeftRight: PropTypes.instanceOf(Enums.GapAndPadding), // from Tabular
  spaceBefore: PropTypes.bool,
  spaceAfter: PropTypes.bool,
  children: PropTypes.node,
};

TabularDescItem.defaultProps = {
  tabularStyle: TabularStyle.LINE,
  paddingLeftRight: Enums.GapAndPadding.NONE,
  spaceBefore: false,
  spaceAfter: false,
  children: null,
};

export default TabularDescItem;
