import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { Link as ReactRouterDomLink } from 'react-router-dom';
import { HashLink } from 'react-router-hash-link';

import Enums from 'assets/enums';
import Icon, { IconSize } from 'components/indicators/icon';
import { selectors } from 'store';

import css from './internalLink.scss';


/**
 * Component of an internal link.
 */
const InternalLink = ({ to, children }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const menuNode = useSelector((state) => selectors.menus.primaryMenu.getMenuNodeById(state, to));


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let url, hasHash;

  if ((typeof to !== 'string') || (to === '')) {
    url = '';
    hasHash = false;
  } else if (to.startsWith('/')) {
    url = to;
    hasHash = to.includes('#');
  } else if (to.startsWith('#')) {
    let path = window.location.pathname;

    // Electron bug: the location starts with "/D:/..." instead of "/..."
    if (path.indexOf(':') >= 0) {
      path = path.substring(path.indexOf(':') + 1);
    }

    url = `${path}${to}`;
    hasHash = true;
  } else {
    url = menuNode ? menuNode.urlPath : '';
    hasHash = false;
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

  // If the URL is invalid, show an error text instead of the link.
  if (url === '') {
    return (
      <span className={css.internalLinkError}>
        {children || <Icon icon="GOTO" size={IconSize.NORMAL} color={Enums.ValueColor.SIGNAL_ERROR} />}
      </span>
    );
  }

  // Internal path with anchor.
  if (hasHash) {
    return (
      <HashLink to={url} smooth>
        {children || <Icon icon="GOTO" size={IconSize.NORMAL} />}
      </HashLink>
    );
  }

  // Full internal link.
  return (
    <ReactRouterDomLink to={url}>
      {children || <Icon icon="GOTO" size={IconSize.NORMAL} />}
    </ReactRouterDomLink>
  );
  //                                                                                  </editor-fold>
};

InternalLink.displayName = 'InternalLink';

InternalLink.propTypes = {
  to: PropTypes.string,
  children: PropTypes.node,
};

InternalLink.defaultProps = {
  to: '',
  children: null,
};

export default InternalLink;
