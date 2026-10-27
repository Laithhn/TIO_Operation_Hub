import PropTypes from 'prop-types';
import {
  Children, memo, useEffect, useContext,
} from 'react';
import { createPortal } from 'react-dom';
import { useDispatch } from 'react-redux';

import Enums from 'assets/enums';
import ContextScope from 'components/contexts/contextScope';
import { ToolbarContrItem } from 'components/layouts/toolbar';
import { actions } from 'store';
import classNames from 'utils/classNames';

import Title from './title';
import css from './mainToolbar.scss';


/**
 * Memoized React component of the main toolbar for dashboard contents of VtWebGuiFramework. Note
 * that it is only memoized if no childrens are given.
 */
const MainToolbar = memo(({
  title, subTitle, columnGap, children,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isScopeModwin, isScopeSecondSidebar } = useContext(ContextScope);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const inModwin = isScopeModwin;
  const inSecondSidebar = !inModwin && isScopeSecondSidebar;
  const inMainScope = !inModwin && !inSecondSidebar;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (inMainScope) {
      dispatch(actions.mainScope.setDefaultMainToolbar());
    }

    return () => {
      if (inMainScope) {
        dispatch(actions.mainScope.setNoMainToolbar());
      }
    };
  }, [inMainScope, dispatch]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const mainToolbarClasses = classNames(css.mainToolbar, {
    [css.inModwin]: inModwin,
    [css.inSecondSidebar]: inSecondSidebar,
  });

  const mainToolbarStyle = {
    columnGap: `${columnGap.value}px`,
  };

  const content = (
    <div className={mainToolbarClasses} style={mainToolbarStyle}>
      <Title title={title} subTitle={subTitle} />
      {children}
    </div>
  );

  if (inModwin) {
    return (content);
  }

  return createPortal(
    content,
    document.getElementById(inSecondSidebar ? 'viSecondSidebarToolbar' : 'viMainToolbar'),
  );
  //                                                                                  </editor-fold>
});

MainToolbar.displayName = 'MainToolbar';

MainToolbar.propTypes = {
  title: PropTypes.string,
  subTitle: PropTypes.string,
  columnGap: PropTypes.instanceOf(Enums.GapAndPadding),
  children: (props, propName, componentName) => (
    (
      (props[propName] !== null)
      && Children.toArray(props[propName]).some((child) => (child.type !== ToolbarContrItem))
    )
      ? new Error(`Invalid prop "${propName}" passed to "${componentName}". If set, only one or more components of type MainToolbarContrItem only are expected.`)
      : undefined
  ),
};

MainToolbar.defaultProps = {
  title: '',
  subTitle: '',
  columnGap: Enums.GapAndPadding.SMALL,
  children: null,
};

export { ToolbarContrItem as MainToolbarContrItem };
export default MainToolbar;
