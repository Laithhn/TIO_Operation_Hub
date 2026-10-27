import PropTypes from 'prop-types';
import { memo } from 'react';

import Icon, { IconSize } from 'components/indicators/icon';
import { IS_DESKTOP_APP, openExternalLink } from 'desktopApp';

import InternalLink from './internalLink';
import css from './link.scss';


/**
 * Memoized React component for links, used in contents of VtWebGuiFramework. Note that it is only
 * memoized, if the given children is a string or a number.
 */
const Link = memo(({ to, children }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let isExternal = false,
    isMail = false,
    isFunc = false;

  if ((typeof to === 'string') && /^https?:\/\//i.test(to)) {
    isExternal = true;
  } else if ((typeof to === 'string') && /^mailto:/i.test(to)) {
    isMail = true;
  } else if (typeof to === 'function') {
    isFunc = true;
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for synthetic React event "onPointerUp" on an external link to redirect the event to
   * the desktop app, if this is used.
   */
  const handleExternalLink = () => {
    if (IS_DESKTOP_APP) {
      openExternalLink(to);
    }
  };


  /**
   * Handler for synthetic React event "onClick" on a link to call a given function.
   */
  const handleFunctionLink = (event) => {
    event.preventDefault();
    to(event);
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------


  // External link with icon behind the content.
  if (isExternal) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" onPointerUp={handleExternalLink}>
        {children || to}
        <span className={css.linkExternalIcon}>
          <Icon icon="OPEN" size={IconSize.SMALL} />
        </span>
      </a>
    );
  }


  // E-Mail-Link.
  if (isMail) {
    return (
      <a href={to} rel="noopener noreferrer">
        {children || to}
      </a>
    );
  }


  // No link but a function to call.
  if (isFunc) {
    return (
      <a href="" onClick={handleFunctionLink}>{children}</a> // eslint-disable-line jsx-a11y/anchor-is-valid
    );
  }


  // Internal link.
  return (
    <InternalLink to={to}>{children}</InternalLink>
  );
  //                                                                                  </editor-fold>
});

Link.displayName = 'Link';

Link.propTypes = {
  to: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  children: PropTypes.node,
};

Link.defaultProps = {
  to: '',
  children: null,
};

export default Link;
