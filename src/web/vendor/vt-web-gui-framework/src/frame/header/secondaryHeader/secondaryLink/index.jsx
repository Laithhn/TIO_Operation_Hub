import PropTypes from 'prop-types';
import {
  useState, useRef, useMemo, useCallback,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import Menu from 'components/controls/menu';
import {
  getStore, actions, selectors, hooks,
} from 'store';
import classNames from 'utils/classNames';

import css from './secondaryLink.scss';


/**
 *
 */
const buildMenuEntries = (ids, menuNodes, translateText) => ids.map((id) => {
  const {
    caption, hidden, disabled, icon, submenuNodeIds,
  } = menuNodes[id];

  return {
    id,
    hidden,
    disabled,
    text: translateText(caption),
    icon,
    subEntries: buildMenuEntries(submenuNodeIds, menuNodes, translateText),
  };
});


/**
 * React component of a link for a menu node that appears in the secondary section of the header.
 */
const SecondaryLink = ({ menuNode }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = hooks.useI18n();

  const allMenuNodes = useSelector(selectors.menus.secondaryMenu.getAllMenuNodes);

  const [showMenu, setShowMenu] = useState(false);

  const buttonRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { viewbox, getIconPath } = useIconsAsync();

  const icon = getIconPath(menuNode.icon);
  const iconSizePx = `${defines.layout.header.iconSize}px`;

  const submenuEntries = useMemo(
    () => buildMenuEntries(menuNode.submenuNodeIds, allMenuNodes, translateText),
    [menuNode, translateText, allMenuNodes],
  );


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
  const handleClickMenuNodeEntry = useCallback(({ scope, contentPath, options }) => {
    switch (Enums.ContentScope.enumValueOf(scope)) {
      // -----------------------------------------------------------------------------------------
      case Enums.ContentScope.MODWIN:
      // -----------------------------------------------------------------------------------------

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

      // -----------------------------------------------------------------------------------------
      case Enums.ContentScope.JS:
      // -----------------------------------------------------------------------------------------

        import(process.env.PATH_CONTENTS + contentPath + '/content.js').then((module) => { // eslint-disable-line prefer-template
          module.default({
            ...getStore(),
            calledId: menuNode.id,
            contentData: options,
          });
        }).catch((e) => {
          throw new Error(`VIWGF/Frame > Header/SecondaryHeader/SecondaryLink: trying to load JavaScript content file from path "${contentPath}" failed: ${e.message}`);
        });
        break;

      // -----------------------------------------------------------------------------------------
      case Enums.ContentScope.BLANK:
      // -----------------------------------------------------------------------------------------

        window.open(contentPath, '_blank');
        break;

      // no default
    }
  }, [menuNode, dispatch]);


  /**
   * Handler for synthetic React event "onClick" on a secondary link. Event propagation is stopped,
   * because the header has a click event too.
   */
  const handleClickSecondaryLink = (event) => {
    event.stopPropagation();

    if (!menuNode.disabled) {
      if (menuNode.submenuNodeIds.length > 0) {
        setShowMenu(true);
      } else {
        handleClickMenuNodeEntry(menuNode);
      }
    }
  };


  /**
   *
   */
  const handleKeyUp = (event) => {
    if ((event.key === 'Enter') || (event.key === ' ')) {
      handleClickSecondaryLink(event);
    }
  };


  /**
   *
   */
  const handleClickMenuEntry = useCallback((_, id) => {
    handleClickMenuNodeEntry(allMenuNodes[id]);
    setShowMenu(false);
  }, [allMenuNodes, handleClickMenuNodeEntry]);


  /**
   *
   */
  const handleHideMenu = useCallback(() => {
    setShowMenu(false);
  }, []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const headerSecondaryLinkClasses = classNames(css.secondaryLink, {
    [css.disabled]: menuNode.disabled,
  });

  return (
    <>
      <span
        ref={buttonRef}
        role="button"
        aria-disabled={menuNode.disabled}
        tabIndex="0"
        {...((process.env.NODE_ENV === 'development') && { id: `secondaryHeader__secondaryLink__${menuNode.id}` })}
        className={headerSecondaryLinkClasses}
        onClick={handleClickSecondaryLink}
        onKeyUp={handleKeyUp}
      >
        {icon && (
          <svg width={iconSizePx} height={iconSizePx} viewBox={viewbox}>
            <path d={icon} />
          </svg>
        )}
      </span>
      {showMenu && (
        <Menu
          anchorElemRef={buttonRef}
          entries={submenuEntries}
          onClick={handleClickMenuEntry}
          onClose={handleHideMenu}
        />
      )}
    </>
  );
  //                                                                                  </editor-fold>
};

SecondaryLink.displayName = 'SecondaryLink';

SecondaryLink.propTypes = {
  menuNode: PropTypes.shape({
    id: PropTypes.string,
    icon: PropTypes.string,
    disabled: PropTypes.bool,
    scope: PropTypes.oneOf(Enums.ContentScope.enumKeys),
    contentPath: PropTypes.string,
    submenuNodeIds: PropTypes.arrayOf(PropTypes.string),
    options: PropTypes.shape({
      modwinTitle: PropTypes.string,
      modwinWidth: PropTypes.number,
      modwinHeight: PropTypes.number,
      modwinDraggable: PropTypes.bool,
      modwinResizable: PropTypes.bool,
      modwinMinimizable: PropTypes.bool,
      modwinUnclosable: PropTypes.bool,
      modwinCloseByEscape: PropTypes.bool,
      modwinMultiple: PropTypes.bool,
      modwinExclusive: PropTypes.bool,
      modwinDimmedBackground: PropTypes.bool,
    }),
  }).isRequired,
};

export default SecondaryLink;
