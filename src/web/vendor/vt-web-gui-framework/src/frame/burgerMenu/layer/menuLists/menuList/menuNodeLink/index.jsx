import PropTypes from 'prop-types';
import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { NavLink } from 'react-router-dom';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import SelectLanguage from 'frame/specialMenuNodes/selectLanguage';
import {
  getStore, actions, selectors, hooks,
} from 'store';
import classNames from 'utils/classNames';

import burgerMenuDefines from '../../../../defines';
import css from './menuNodeLink.scss';


const naviIconDimPx = `${burgerMenuDefines.naviIconDim}px`;


/**
 *
 */
const InnerPart = ({
  caption, level, icon, hasSubmenuNodes,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl, translateText } = hooks.useI18n();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { viewbox, getIconPath } = useIconsAsync();
  let iconPath, iconDimPx, sign;

  switch (level) {
    case 1:
      iconPath = getIconPath(icon) ?? '';
      iconDimPx = `${burgerMenuDefines.linkLevel1.iconDim}px`;
      break;

    case 2:
      iconPath = getIconPath(icon) ?? '';
      iconDimPx = `${burgerMenuDefines.linkLevel2.iconDim}px`;
      break;

    case 3:
      sign = icon ?? '';
      break;
    // no default
  }


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

  return (
    <>
      {iconPath && (
        <svg width={iconDimPx} height={iconDimPx} viewBox={viewbox}>
          <path d={iconPath} />
        </svg>
      )}
      {sign && <span className={css.sign}>{sign}</span>}
      <span className={css.caption}>{translateText(caption)}</span>
      {hasSubmenuNodes && (
        <svg width={naviIconDimPx} height={naviIconDimPx} viewBox={viewbox}>
          <path d={getIconPath(isRtl ? 'NAVILEFT' : 'NAVIRIGHT')} />
        </svg>
      )}
    </>
  );
  //                                                                                  </editor-fold>
};

InnerPart.displayName = 'InnerPart';

InnerPart.propTypes = {
  caption: PropTypes.string,
  level: PropTypes.number.isRequired,
  icon: PropTypes.string,
  hasSubmenuNodes: PropTypes.bool,
};

InnerPart.defaultProps = {
  caption: '',
  icon: '',
  hasSubmenuNodes: false,
};


/**
 * React component of a link for menu nodes of each level in the hamburger menu.
 */
const MenuNodeLink = ({
  menuNode: {
    id, caption, level, icon, disabled, isSpecialMenuNode, scope, urlPath, contentPath,
    submenuNodeIds, options,
  },
  isSecondaryMenu,
  onClick,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const isActive = useSelector((state) => selectors.menus.primaryMenu.isMenuNodeActive(state, id));


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const hasContent = !!contentPath;
  const hasSubmenuNodes = submenuNodeIds && (submenuNodeIds.length > 0);


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
  const handleClick = useCallback((event) => {
    event.stopPropagation();

    if (!disabled) {
      if (isSecondaryMenu && !hasSubmenuNodes) {
        switch (Enums.ContentScope.enumValueOf(scope)) {
          // ---------------------------------------------------------------------------------------
          case Enums.ContentScope.MODWIN:
          // ---------------------------------------------------------------------------------------

            dispatch(actions.modwins.startLoadingContent({
              contentPath,
              contentData: options,
              title: options.modwinTitle,
              width: options.modwinWidth,
              height: options.modwinHeight,
              draggable: options.modwinDraggable,
              resizable: options.modwinResizable,
              unclosable: options.modwinUnclosable,
              closeByEscape: options.modwinCloseByEscape,
              minimizable: options.modwinMinimizable,
              multiple: options.modwinMultiple,
              exclusive: options.modwinExclusive,
              dimmedBackground: options.modwinDimmedBackground,
            }));
            break;

          // ---------------------------------------------------------------------------------------
          case Enums.ContentScope.JS:
          // ---------------------------------------------------------------------------------------

            import(process.env.PATH_CONTENTS + contentPath + '/content.js').then((module) => { // eslint-disable-line prefer-template
              module.default({
                ...getStore(),
                calledId: id,
                contentData: options,
              });
            }).catch((e) => {
              throw new Error(`VIWGF/Frame > BurgerMenu/Layer/MenuLists/MenuList/MenuNodeLink: trying to load JavaScript content file from path "${contentPath}" failed: ${e.message}`);
            });
            break;

          // -----------------------------------------------------------------------------------------
          case Enums.ContentScope.BLANK:
            // -----------------------------------------------------------------------------------------

            window.open(contentPath, '_blank');
            break;

          // no default
        }
      }

      onClick(id, { hasContent, hasSubmenuNodes });
    }
  }, [id, disabled, scope, contentPath, options, hasContent, hasSubmenuNodes, isSecondaryMenu, onClick, dispatch]);


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

  const menuNodeLinkClasses = classNames(css.menuNodeLink, {
    [css.isLevel1]: (level <= 1),
    [css.isLevel2]: (level === 2),
    [css.isLevel3]: (level >= 3),
    [css.hasIconOrSign]: icon,
    [css.active]: !isSecondaryMenu && isActive,
    [css.disabled]: disabled,
  });

  if (!isSecondaryMenu && !disabled && hasContent) {
    return (
      <NavLink
        {...((process.env.NODE_ENV === 'development') && { id: `burgerMenu__link__${id}` })}
        className={menuNodeLinkClasses}
        to={{ pathname: urlPath }}
        onClick={handleClick}
      >
        <InnerPart
          caption={caption}
          level={level}
          icon={icon}
          hasSubmenuNodes={hasSubmenuNodes}
        />
      </NavLink>
    );
  }


  if (isSecondaryMenu && isSpecialMenuNode) {
    if (id === defines.system.specialMenuNodeIds.selectLanguage) {
      return (
        <div className={css.menuNodeContr}>
          <SelectLanguage disabled={disabled} />
        </div>
      );
    }
  }

  return (
    <span
      role="button"
      aria-disabled={disabled}
      tabIndex="0"
      {...((process.env.NODE_ENV === 'development') && { id: `burgerMenu__link__${id}` })}
      className={menuNodeLinkClasses}
      onClick={handleClick}
      onKeyUp={handleKeyUp}
    >
      <InnerPart
        caption={caption}
        level={level}
        icon={icon}
        hasSubmenuNodes={hasSubmenuNodes}
      />
    </span>
  );
  //                                                                                  </editor-fold>
};

MenuNodeLink.displayName = 'MenuNodeLink';

MenuNodeLink.propTypes = {
  menuNode: PropTypes.shape({
    id: PropTypes.string.isRequired,
    caption: PropTypes.string,
    level: PropTypes.number.isRequired,
    icon: PropTypes.string,
    disabled: PropTypes.bool,
    isSpecialMenuNode: PropTypes.bool,
    scope: PropTypes.string,
    urlPath: PropTypes.string,
    contentPath: PropTypes.string,
    submenuNodeIds: PropTypes.arrayOf(PropTypes.string),
    options: PropTypes.object,
  }).isRequired,
  isSecondaryMenu: PropTypes.bool,
  onClick: PropTypes.func,
};

MenuNodeLink.defaultProps = {
  isSecondaryMenu: false,
  onClick() {},
};

export default MenuNodeLink;
