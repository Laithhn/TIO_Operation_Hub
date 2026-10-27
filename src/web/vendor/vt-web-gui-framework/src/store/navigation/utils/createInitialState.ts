import { pushLogEntry } from 'store/pushLogEntry';
import { getAttributeInLowerCase, isAttributeTrue } from 'utils/element';
import { normalizeUrlPath } from 'utils/normalizeUrlPath';

import type { AdditionalUrlPath, NavigationState } from '../navigation.types';


/**
 * Function to set data of the given XML configuration to the partial Redux state of the slice by
 * mutating the given draft state.
 *
 * @param draftState - A mutable copy of the partial state of the slice.
 * @param config - The XML element of the configuration, conforming to schema file config.xsd. Some
 *   entries of this configuration are set to the partial state.
 */
export const createInitialState = (draftState: NavigationState, config: Element) => {
  // -----------------------------------------------------------------------------------------------
  // Read configuration node "Configuration > Navigation".
  // -----------------------------------------------------------------------------------------------

  const xmlNavigation = config.querySelector(':scope > Navigation');

  if (xmlNavigation) {
    // ---------------------------------------------------------------------------------------------
    // Read configuration node "Configuration > Navigation > AddUrlPathes".
    // ---------------------------------------------------------------------------------------------

    const xmlAddUrlPathes = xmlNavigation.querySelector('AddUrlPathes');

    if (xmlAddUrlPathes) {
      // do for every URL node..
      Array.from(xmlAddUrlPathes.querySelectorAll('AddUrlPath')).forEach((xmlAddUrlPath) => {
        const isDisabled = isAttributeTrue(xmlAddUrlPath, 'isDisabled');
        const options: AdditionalUrlPath['options'] = {};
        let path = (xmlAddUrlPath.getAttribute('path') ?? '').trim();

        if (path) {
          path = normalizeUrlPath(path.trim(), { leadingSlash: true, trailingSlash: false });

          if (!draftState.addUrlPathes.allPathes.includes(path)) {
            const xmlContent = xmlAddUrlPath.querySelector(':scope > Content');

            if (xmlContent) {
              // if no content path is given, the result will always be "/"
              const contentPath = normalizeUrlPath(xmlContent.textContent, { leadingSlash: true, trailingSlash: false });

              const xmlOptions = xmlAddUrlPath.querySelector(':scope > Options');

              if (xmlOptions) {
                const { attributes } = xmlOptions;

                for (const attribute of attributes) {
                  options[attribute.name] = attribute.value;
                }
              }

              draftState.addUrlPathes.byPath[path] = {
                path, isDisabled, contentPath, options,
              };
              draftState.addUrlPathes.allPathes.push(path);
            } else {
              pushLogEntry(draftState.logs, {
                slice: 'navigation',
                level: 'error',
                timestamp: Date.now(),
                text: `The additional URL path "${path}" in <Navigation><AddUrlPathes> in the configuration has no node "Content".`,
              });
            }
          } else {
            pushLogEntry(draftState.logs, {
              slice: 'navigation',
              level: 'error',
              timestamp: Date.now(),
              text: `The additional URL path "${path}" is used for several entries in <Navigation><AddUrlPathes> in the configuration, but it has to be unique.`,
            });
          }
        } else {
          pushLogEntry(draftState.logs, {
            slice: 'navigation',
            level: 'error',
            timestamp: Date.now(),
            text: 'An additional URL path in <Navigation><AddUrlPathes> in the configuration has no or an empty attribute "path".',
          });
        }
      });
    }

    // ---------------------------------------------------------------------------------------------
    // Read optional configuration node "Configuration > Navigation > UrlQueries".
    // ---------------------------------------------------------------------------------------------

    const xmlUrlQueries = xmlNavigation.querySelector('UrlQueries');

    if (xmlUrlQueries) {
      const preserve = getAttributeInLowerCase(xmlUrlQueries, 'preserve');

      if (preserve === 'true') {
        draftState.urlQueries.preserve = true;
      } else if (preserve === 'false') {
        draftState.urlQueries.preserve = false;
      } else if (preserve) {
        draftState.urlQueries.preserve = preserve.split(',').filter((key) => (key !== ''));
      }
    }
  }
};
