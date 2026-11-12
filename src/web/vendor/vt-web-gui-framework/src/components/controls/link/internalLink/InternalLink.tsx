import { NavigationLink } from 'components/helpers/navigationLink';
import { useSelector } from 'components/hooks/useSelector';
import { Icon } from 'components/indicators/icon';
import { primaryMenuSlice } from 'store/menus/primaryMenu';

import * as css from './internalLink.scss';
import type { InternalLinkProps } from './internalLink.types';


/**
 * React sub-component of an internal link of the control component "Link".
 */
const InternalLink = ({
  to, contentData, children,
}: InternalLinkProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const menuNode = useSelector((state) => primaryMenuSlice.selectMenuNode(state, to));
  const isMenuNodeReachable = useSelector((state) => primaryMenuSlice.selectIsMenuNodeReachable(state, to));


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let url;

  if (to === '') {
    url = '';
  } else if (to.startsWith('/')) {
    url = to;
  } else if (to.startsWith('#')) {
    let path = window.location.pathname;

    // Electron bug: the location starts with "/D:/..." instead of "/..."
    if (path.includes(':')) {
      path = path.substring(path.indexOf(':') + 1);
    }

    url = `${path}${to}`;
  } else {
    url = menuNode ? menuNode.urlPath : '';
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
        {children || <Icon icon="GOTO" size="normal" color="signalError" />}
      </span>
    );
  }

  // A menu node that is hidden or disabled, itself or through one of its parents, is a status the
  // application set on purpose rather than a mistake, so its link shows as plain text.
  if (menuNode && !isMenuNodeReachable) {
    return children;
  }

  // A resolved link is an "a" like every other form of the control, so the rule for "a" letters it
  // for the ground it sits on (see _nativeElements.scss).
  return (
    <NavigationLink to={url} {...(contentData && { state: contentData })}>
      {children || <Icon icon="GOTO" size="normal" />}
    </NavigationLink>
  );
  //                                                                                  </editor-fold>
};

InternalLink.displayName = 'InternalLink';


export { InternalLink };
