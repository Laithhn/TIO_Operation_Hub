import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import { selectors, hooks } from 'store';

import burgerMenuDefines from '../../defines';
import css from './navBackButton.scss';


const naviIconDimPx = `${burgerMenuDefines.naviIconDim}px`;


/**
 * React component of ...
 */
const NavBackButton = ({ menuNodeId, onClick }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl, translateText } = hooks.useI18n();

  const primaryMenuNode = useSelector((state) => selectors.menus.primaryMenu.getMenuNodeById(state, menuNodeId));
  const secondaryMenuNode = useSelector((state) => selectors.menus.secondaryMenu.getMenuNodeById(state, menuNodeId));


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { viewbox, getIconPath } = useIconsAsync();
  const menuNode = primaryMenuNode ?? secondaryMenuNode;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const handleClick = (event) => {
    event.stopPropagation();

    if (menuNode.level === 1) {
      onClick(null);
    } else {
      onClick(menuNode.menuNodeTree[menuNode.menuNodeTree.length - 2]);
    }
  };


  /**
   *
   */
  const handleKeyUp = (event) => {
    if ((event.key === 'Enter') || (event.key === ' ')) {
      handleClick(event);
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

  return (
    <div
      role="button"
      tabIndex="0"
      {...((process.env.NODE_ENV === 'development') && { id: 'burgerMenu__navBack' })}
      className={css.navBackButton}
      onClick={handleClick}
      onKeyUp={handleKeyUp}
    >
      <svg width={naviIconDimPx} height={naviIconDimPx} viewBox={viewbox}>
        <path d={getIconPath(isRtl ? 'NAVIRIGHT' : 'NAVILEFT')} />
      </svg>
      <span className={css.caption}>{translateText(menuNode.caption)}</span>
    </div>
  );
  //                                                                                  </editor-fold>
};

NavBackButton.displayName = 'NavBackButton';

NavBackButton.propTypes = {
  menuNodeId: PropTypes.string.isRequired,
  onClick: PropTypes.func,
};

NavBackButton.defaultProps = {
  onClick() {},
};

export default NavBackButton;
