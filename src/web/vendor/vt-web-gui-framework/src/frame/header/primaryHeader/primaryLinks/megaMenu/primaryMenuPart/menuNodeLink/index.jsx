import PropTypes from 'prop-types';
import { memo } from 'react';
import { useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import { selectors, hooks } from 'store';
import classNames from 'utils/classNames';

import megaMenuDefines from '../../defines';
import css from './menuNodeLink.scss';


/**
 *
 */
const InnerPart = ({ caption, level, icon }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = hooks.useI18n();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { viewbox, getIconPath } = useIconsAsync();
  let iconPath, iconDimPx, sign;

  switch (level) {
    case 2:
      iconPath = getIconPath(icon) ?? '';
      iconDimPx = `${megaMenuDefines.linkLevel2.iconDim}px`;
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
        <svg width={iconDimPx} height={iconDimPx} viewBox={viewbox} className={css.icon}>
          <path d={iconPath} />
        </svg>
      )}
      {sign && <span className={css.sign}>{sign}</span>}
      <span className={css.caption}>{translateText(caption)}</span>
    </>
  );
  //                                                                                  </editor-fold>
};

InnerPart.displayName = 'InnerPart';

InnerPart.propTypes = {
  caption: PropTypes.string,
  level: PropTypes.number.isRequired,
  icon: PropTypes.string,
};

InnerPart.defaultProps = {
  caption: '',
  icon: '',
};


/**
 * Memoized React component of a primary submenu node of the 2nd or 3rd level in the mega menu. It
 * must be ensured in the parent component, that the given menu node is not hidden.
 */
const MenuNodeLink = memo(({ menuNode, onClose }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const {
    id, caption, level, icon, disabled, urlPath,
  } = menuNode;

  const isActive = useSelector((state) => selectors.menus.primaryMenu.isMenuNodeActive(state, id));


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

  // only menu nodes with level 2 or 3 are allowed here
  if (level < 2) {
    return null;
  }


  const menuNodeLinkClasses = classNames(css.menuNodeLink, {
    [css.isLevel2]: (level === 2),
    [css.isLevel3]: (level >= 3),
    [css.active]: isActive,
    [css.disabled]: disabled,
  });

  if (disabled) {
    return (
      <span
        {...((process.env.NODE_ENV === 'development') && { id: `megaMenu__menuNodeLink__${id}` })}
        className={menuNodeLinkClasses}
      >
        <InnerPart caption={caption} level={level} icon={icon} />
      </span>
    );
  }

  return (
    <NavLink
      {...((process.env.NODE_ENV === 'development') && { id: `megaMenu__menuNodeLink__${id}` })}
      className={menuNodeLinkClasses}
      to={{ pathname: urlPath }}
      onClick={onClose}
    >
      <InnerPart caption={caption} level={level} icon={icon} />
    </NavLink>
  );
  //                                                                                  </editor-fold>
});

MenuNodeLink.displayName = 'MenuNodeLink';

MenuNodeLink.propTypes = {
  menuNode: PropTypes.shape({
    id: PropTypes.string,
    caption: PropTypes.string,
    level: PropTypes.number,
    icon: PropTypes.string,
    disabled: PropTypes.bool,
    urlPath: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func,
};

MenuNodeLink.defaultProps = {
  onClose() {},
};

export default MenuNodeLink;
