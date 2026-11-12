import type { FooterState } from '../footer.types';

import { parseContentPath } from './parseContentPath';


/**
 * Function to set data of the given XML configuration to the partial Redux state of the slice by
 * mutating the given draft state.
 *
 * @param draftState - A mutable copy of the partial state of the slice.
 * @param config - The XML element of the configuration, conforming to schema file config.xsd. Some
 *   entries of this configuration are set to the partial state.
 */
export const createInitialState = (draftState: FooterState, config: Element) => {
  // -----------------------------------------------------------------------------------------------
  // Read configuration node "Configuration > Footer".
  // -----------------------------------------------------------------------------------------------

  const xmlFooter = config.querySelector(':scope > Footer');

  if (xmlFooter) {
    // ---------------------------------------------------------------------------------------------
    // Read optional configuration node "Configuration > Footer > Content".
    // ---------------------------------------------------------------------------------------------

    const xmlFooterContent = xmlFooter.querySelector('Content');

    if (xmlFooterContent) {
      draftState.contentPath = parseContentPath(xmlFooterContent.textContent);
    }
  }
};
