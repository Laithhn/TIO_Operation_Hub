import { Link, type Path, useLocation } from 'react-router';

import { useSelector } from 'components/hooks/useSelector';
import { navigationSlice } from 'store/navigation';

import type { NavigationLinkProps } from './navigationLink.types';


/**
 * React component of the helper component "NavigationLink", that is an universal navigation link
 * using the react-router component "Link". It is used by the control component "Link" and by many
 * modules in the app. Don't use it directly in your content, but rather the control component
 * "Link".
 */
const NavigationLink = ({
  ref, id, className, to, state, onClick, children,
}: NavigationLinkProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { search: locationSearch } = useLocation();

  const preservedUrlQueries = useSelector(navigationSlice.selectPreservedUrlQueries);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { pathname, search, hash } = /^(?<pathname>\/[/\w-+.%]*)(?<search>\?[\w-+.,%=&]+)?(?<hash>#.+)?/.exec(to)?.groups ?? {};
  let path: Path;

  if (!pathname) {
    path = { pathname: '', search: '', hash: '' };
  } else {
    // Transform the key value pairs of the search string of the given prop "to" into an object.
    let searchObj: Record<string, string> = search
      ? search.substring(1).split('&').reduce((acc, part) => {
        const [key, value] = part.split('=');

        if (!key) {
          return acc;
        }

        return {
          ...acc,
          [key.toLowerCase()]: value ?? '',
        };
      }, {})
      : {};

    // Dependent on the state "preservedUrlQueries", take over the key value pairs of the search
    // string of the current location to the search object for the link. Note this can overwrite
    // values, if the same keys are given at prop "to" (see above).
    if (locationSearch && (preservedUrlQueries !== false)) {
      searchObj = locationSearch.substring(1).split('&').reduce((acc, part) => {
        const [key, value] = part.split('=');

        if (
          (key)
          && ((preservedUrlQueries === true) || preservedUrlQueries.includes(key.toLowerCase()))
        ) {
          return {
            ...acc,
            [key.toLowerCase()]: value ?? '',
          };
        }

        return acc;
      }, searchObj);
    }

    const nextSearchStr = Object.keys(searchObj)
      .map((key, idx) => `${(idx === 0) ? '?' : ''}${key}=${searchObj[key]}`)
      .join('&');

    path = {
      pathname,
      search: nextSearchStr,
      hash: hash ?? '',
    };
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
    <Link
      ref={ref}
      {...(id && { id })}
      className={className}
      to={path}
      state={state}
      onClick={onClick}
    >
      {children}
    </Link>
  );
  //                                                                                  </editor-fold>
};

NavigationLink.displayName = 'NavigationLink';


export { NavigationLink };
