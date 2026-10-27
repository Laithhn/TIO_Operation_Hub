import PropTypes from 'prop-types';
import {
  memo, useRef, useCallback, useEffect,
} from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { selectors, hooks } from 'store';
import classNames from 'utils/classNames';

import css from './primaryLink.scss';


/**
 * React component of a link of a menu node that appears in the primary section of the header.
 */
const PrimaryLink = memo(({
  menuNode, ignoreActiveMenuTree, onActive, onClick,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = hooks.useI18n();

  const isMenuTreeActive = (
    useSelector((state) => selectors.menus.primaryMenu.isIdPartOfActiveMenuTree(state, menuNode.id))
    && !ignoreActiveMenuTree
  );

  const primaryLinkRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const caption = translateText(menuNode.caption);


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
  const handleClick = useCallback(() => {
    if (primaryLinkRef.current) {
      onClick({
        menuNodeId: menuNode.id,
        absPosX: Math.round(primaryLinkRef.current.getBoundingClientRect().x),
        width: primaryLinkRef.current.clientWidth,
      });
    }
  }, [menuNode.id, onClick]);


  /**
   * Handler to call prop onActive with the current position and dimension of the Link, if it is
   * part of the active menu tree.
   */
  const handleDomChange = useCallback(() => {
    if (primaryLinkRef.current) {
      onActive({
        menuNodeId: menuNode.id,
        relPosX: primaryLinkRef.current.offsetLeft,
        width: primaryLinkRef.current.clientWidth,
      });
    }
  }, [menuNode.id, onActive]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (isMenuTreeActive) {
      document.addEventListener('domChange', handleDomChange);

      return () => {
        document.removeEventListener('domChange', handleDomChange);
      };
    }

    return undefined;
  }, [isMenuTreeActive, handleDomChange]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (menuNode.disabled) {
    return (
      <span className={css.primaryDisabledLink}>{caption}</span>
    );
  }


  const primaryLinkClasses = classNames(css.primaryLink, {
    [css.active]: isMenuTreeActive,
  });

  return (
    <Link
      ref={primaryLinkRef}
      {...(!ignoreActiveMenuTree && { to: menuNode.urlPath })}
      {...((process.env.NODE_ENV === 'development') && { id: `primaryHeader__primaryLink__${menuNode.id}` })}
      className={primaryLinkClasses}
      onClick={handleClick}
    >
      {caption}
    </Link>
  );
  //                                                                                  </editor-fold>
});

PrimaryLink.displayName = 'PrimaryLink';

PrimaryLink.propTypes = {
  menuNode: PropTypes.shape({
    id: PropTypes.string,
    caption: PropTypes.string,
    disabled: PropTypes.bool,
    urlPath: PropTypes.string,
    contentPath: PropTypes.string,
  }).isRequired,
  ignoreActiveMenuTree: PropTypes.bool,
  onActive: PropTypes.func,
  onClick: PropTypes.func,
};

PrimaryLink.defaultProps = {
  ignoreActiveMenuTree: false,
  onActive() {},
  onClick() {},
};

export default PrimaryLink;
