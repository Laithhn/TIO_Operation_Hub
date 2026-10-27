import { parseStorageType } from 'interfaces/storageItf';
import { getAttributeInLowerCase, isAttributeTrue } from 'utils/element';
import { normalizeUrlPath } from 'utils/normalizeUrlPath';

import type { SecondSidebarState } from '../secondSidebar.types';


/**
 * Function to set data of the given XML configuration to the partial Redux state of the slice by
 * mutating the given draft state.
 *
 * @param draftState - A mutable copy of the partial state of the slice.
 * @param config - The XML element of the configuration, conforming to schema file config.xsd. Some
 *   entries of this configuration are set to the partial state.
 */
export const createInitialState = (draftState: SecondSidebarState, config: Element) => {
  // -----------------------------------------------------------------------------------------------
  // Read optional configuration node "Configuration > Sidebars > SecondSidebar".
  // -----------------------------------------------------------------------------------------------

  const xmlSecondSidebar = config.querySelector(':scope > Sidebars > SecondSidebar');

  if (xmlSecondSidebar) {
    const width = Number(xmlSecondSidebar.getAttribute('width'));

    if (width > 0) {
      draftState.width = width;
    }

    draftState.isMinimizable = isAttributeTrue(xmlSecondSidebar, 'isMinimizable');
    draftState.isMinimized = draftState.isMinimizable && isAttributeTrue(xmlSecondSidebar, 'isMinimized');
    draftState.isResizable = isAttributeTrue(xmlSecondSidebar, 'isResizable');
    draftState.storageType = parseStorageType(getAttributeInLowerCase(xmlSecondSidebar, 'storageType'));

    // ---------------------------------------------------------------------------------------------
    // Read optional configuration node "Configuration > Sidebars > SecondSidebar > Content".
    // ---------------------------------------------------------------------------------------------

    const xmlSecondSidebarContent = xmlSecondSidebar.querySelector('Content');

    if (xmlSecondSidebarContent) {
      let contentPath = normalizeUrlPath(xmlSecondSidebarContent.textContent, { leadingSlash: true, trailingSlash: false });

      if (contentPath.length > 1) {
        if (!/\/content.[jt]sx$/i.test(contentPath)) {
          contentPath = `${contentPath}/content.tsx`;
        }

        draftState.content.path = contentPath;
      }
    }
  }
};
