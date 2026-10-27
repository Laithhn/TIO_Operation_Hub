import { useSelector, useDispatch } from 'react-redux';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import { actions, selectors } from 'store';
import classNames from 'utils/classNames';

import css from './minimizeButton.scss';


/**
 * React component of the minimize / maximize button for the second sidebar.
 */
const MinimizeButton = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const isRtl = useSelector(selectors.i18n.isCurrentLanguageRtl);
  const contentIsDashboard = (useSelector(selectors.mainScope.getContentType) === Enums.ContentType.DASHBOARD);
  const mainToolbarType = useSelector(selectors.mainScope.getMainToolbarType);
  const isBelowMainToolbar = useSelector(selectors.sidebars.secondSidebar.isBelowMainToolbar);
  const isMinimized = useSelector(selectors.sidebars.secondSidebar.isMinimized);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { viewbox, getIconPath } = useIconsAsync();

  const svgDimPx = `${defines.layout.controls.iconDimDefault}px`;
  const icon = getIconPath(isRtl ? 'NAVILEFTFAST' : 'NAVIRIGHTFAST');


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const handleClick = () => {
    if (isMinimized) {
      dispatch(actions.sidebars.secondSidebar.maximize());
    } else {
      dispatch(actions.sidebars.secondSidebar.minimize());
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const minimizeButtonClasses = classNames(css.minimizeButton, {
    [css.minimized]: isMinimized,
    [css.isDashboard]: contentIsDashboard,
    [css.besideDefaultMainToolbar]: ((mainToolbarType === 'DEFAULT') && !isBelowMainToolbar),
  });

  return (
    <button
      type="button"
      className={minimizeButtonClasses}
      onClick={handleClick}
    >
      {icon && (
        <svg width={svgDimPx} height={svgDimPx} viewBox={viewbox}>
          <path d={icon} />
        </svg>
      )}
    </button>
  );
  //                                                                                  </editor-fold>
};

MinimizeButton.displayName = 'MinimizeButton';

export default MinimizeButton;
