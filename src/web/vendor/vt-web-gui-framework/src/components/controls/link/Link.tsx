import { Icon } from 'components/indicators/icon';
import { IS_DESKTOP_APP, openExternalLink } from 'desktopApp';

import { InternalLink } from './internalLink/InternalLink';
import * as css from './link.scss';
import type { LinkProps, ToAsFunc } from './link.types';


/**
 * React component of the control component "Link", used in contents of VtWebGuiFramework.
 */
const Link = ({
  to, contentData, children,
}: LinkProps) => {
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
   * Handler for the synthetic React event "onPointerUp" of an external link to redirect the event
   * to the desktop app, if this is used.
   */
  const handlePointerUp: React.PointerEventHandler<HTMLAnchorElement> = () => {
    if (IS_DESKTOP_APP) {
      openExternalLink(to);
    }
  };


  /**
   * Handler for the synthetic React event "onClick" of the link to call a given function.
   */
  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
    event.preventDefault();
    (to as ToAsFunc)(event, contentData);
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
      <a
        href={to as string}
        target="_blank"
        rel="noopener noreferrer"
        onPointerUp={handlePointerUp}
      >
        {children || (to as string)}
        <span className={css.linkExternalIcon}>
          <Icon icon="OPEN" size="small" />
        </span>
      </a>
    );
  }


  // E-Mail-Link.
  if (isMail) {
    return (
      <a href={to as string} rel="noopener noreferrer">
        {children || (to as string)}
      </a>
    );
  }


  // No link but a function to call.
  if (isFunc) {
    return (
      <a href="" onClick={handleClick}>{children}</a> // eslint-disable-line jsx-a11y/anchor-is-valid
    );
  }


  // Internal link.
  return (
    <InternalLink to={to as string} {...(contentData && { contentData })}>
      {children}
    </InternalLink>
  );
  //                                                                                  </editor-fold>
};

Link.displayName = 'Link';


export { Link };
