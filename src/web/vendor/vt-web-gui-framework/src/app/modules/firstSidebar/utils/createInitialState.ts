import { isAttributeTrue } from 'utils/element';
import { normalizeUrlPath } from 'utils/normalizeUrlPath';

import type { FirstSidebarState } from '../firstSidebar.types';


/**
 * Function to set data of the given XML configuration to the partial Redux state of the slice by
 * mutating the given draft state.
 *
 * @param draftState - A mutable copy of the partial state of the slice.
 * @param config - The XML element of the configuration, conforming to schema file config.xsd. Some
 *   entries of this configuration are set to the partial state.
 */
export const createInitialState = (draftState: FirstSidebarState, config: Element) => {
  // -----------------------------------------------------------------------------------------------
  // Read optional configuration node "Configuration > Sidebars > FirstSidebar".
  // -----------------------------------------------------------------------------------------------

  const xmlFirstSidebar = config.querySelector(':scope > Sidebars > FirstSidebar');

  if (xmlFirstSidebar) {
    // ---------------------------------------------------------------------------------------------
    // Read optional configuration node "Configuration > Sidebars > FirstSidebar > Title".
    // ---------------------------------------------------------------------------------------------

    const xmlFirstSidebarTitle = xmlFirstSidebar.querySelector('Title');

    if (xmlFirstSidebarTitle) {
      draftState.title = ((isAttributeTrue(xmlFirstSidebarTitle, 'fromBuild')
        ? process.env['PROJECTNAME']
        : xmlFirstSidebarTitle.textContent
      ) ?? '').trim();
    }

    // ---------------------------------------------------------------------------------------------
    // Read optional configuration node "Configuration > Sidebars > FirstSidebar > Content".
    // ---------------------------------------------------------------------------------------------

    const xmlFirstSidebarContent = xmlFirstSidebar.querySelector('Content');

    if (xmlFirstSidebarContent) {
      let contentPath = normalizeUrlPath(xmlFirstSidebarContent.textContent, { leadingSlash: true, trailingSlash: false });

      if (contentPath.length > 1) {
        if (!/\/content.[jt]sx$/i.test(contentPath)) {
          contentPath = `${contentPath}/content.tsx`;
        }

        draftState.content.path = contentPath;
      }
    }
  }
};
