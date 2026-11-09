import { isAttributeTrue } from 'utils/element';

import type { HeaderState } from '../header.types';


/**
 * Function to set data of the given XML configuration to the partial Redux state of the slice by
 * mutating the given draft state.
 *
 * @param draftState - A mutable copy of the partial state of the slice.
 * @param config - The XML element of the configuration, conforming to schema file config.xsd. Some
 *   entries of this configuration are set to the partial state.
 */
export const createInitialState = (draftState: HeaderState, config: Element) => {
  // -----------------------------------------------------------------------------------------------
  // Read optional configuration node "Configuration > Common".
  // -----------------------------------------------------------------------------------------------

  const xmlCommon = config.querySelector(':scope > Common');

  if (xmlCommon) {
    // ---------------------------------------------------------------------------------------------
    // Read optional configuration node "Configuration > Common > Logo".
    // ---------------------------------------------------------------------------------------------

    const xmlLogo = xmlCommon.querySelector('Logo');

    if (xmlLogo) {
      draftState.logo = (isAttributeTrue(xmlLogo, 'isDisabled')
        ? false
        : (xmlLogo.textContent.trim() || true)
      );
    }

    // ---------------------------------------------------------------------------------------------
    // Read optional configuration node "Configuration > Common > HeaderTitle".
    // ---------------------------------------------------------------------------------------------

    const xmlHeaderTitle = xmlCommon.querySelector('HeaderTitle');

    if (xmlHeaderTitle) {
      draftState.title = ((isAttributeTrue(xmlHeaderTitle, 'fromBuild')
        ? process.env['PROJECTNAME']
        : xmlHeaderTitle.textContent
      ) ?? '').trim();
    }
  }
};
