import { pushLogEntry } from 'store/pushLogEntry';
import { isAttributeTrue } from 'utils/element';

import { parseContentPath } from '../../utils/parseContentPath';
import { parseIcon } from '../../utils/parseIcon';
import { parseMenuNodeId } from '../../utils/parseMenuNodeId';
import { parseUrlPathPart } from '../../utils/parseUrlPathPart';
import type { PrimaryMenuNode, PrimaryMenuState } from '../primaryMenu.types';


/**
 * Function to set data of the given XML configuration to the partial Redux state of the slice by
 * mutating the given draft state.
 *
 * @param draftState - A mutable copy of the partial state of the slice.
 * @param config - The XML element of the configuration, conforming to schema file config.xsd. Some
 *   entries of this configuration are set to the partial state.
 */
export const createInitialState = (draftState: PrimaryMenuState, config: Element) => {
  // -----------------------------------------------------------------------------------------------
  // Read configuration node "Configuration > Menus > PrimaryMenu".
  // -----------------------------------------------------------------------------------------------

  const xmlPrimaryMenu = config.querySelector(':scope > Menus > PrimaryMenu');

  if (xmlPrimaryMenu) {
    const isOnlyOneMenuNode = (xmlPrimaryMenu.querySelectorAll('MenuNode').length === 1);
    const behaviorAtInvalidUrl = xmlPrimaryMenu.getAttribute('behaviorAtInvalidUrl') ?? '_startpage';

    if (['_startpage', '_blank', '_error'].includes(behaviorAtInvalidUrl.trim().toLowerCase())) {
      draftState.behaviorAtInvalidUrl = behaviorAtInvalidUrl.trim().toLowerCase();
    } else {
      draftState.behaviorAtInvalidUrl = parseContentPath(behaviorAtInvalidUrl) || '_blank';
    }

    // do for every primary menu node..
    Array.from(xmlPrimaryMenu.querySelectorAll('MenuNode')).forEach((xmlMenuNode) => {
      const id = parseMenuNodeId(xmlMenuNode.getAttribute('id'));

      if (id === null) {
        pushLogEntry(draftState.logs, {
          slice: 'menus/primaryMenu',
          level: 'error',
          timestamp: Date.now(),
          text: 'A menu node of <Menus><PrimaryMenu> in the configuration has no or an empty attribute "id".',
        });
      } else if (draftState.menuNodes.allIds.includes(id)) {
        pushLogEntry(draftState.logs, {
          slice: 'menus/primaryMenu',
          level: 'error',
          timestamp: Date.now(),
          text: `The ID "${id}" is used for several menu nodes in <Menus><PrimaryMenu> in the configuration, but it has to be unique.`,
        });
      } else {
        const mn: PrimaryMenuNode = {
          id,
          caption: (xmlMenuNode.getAttribute('caption') ?? '').trim(),
          level: 1,
          icon: xmlMenuNode.getAttribute('icon'),
          isStartpage: isAttributeTrue(xmlMenuNode, 'isStartpage'),
          isHidden: isAttributeTrue(xmlMenuNode, 'isHidden'),
          isDisabled: isAttributeTrue(xmlMenuNode, 'isDisabled'),
          urlPath: '',
          contentPath: '',
          menuNodeTree: [],
          submenuNodeIds: [],
          options: {},
        };
        const xmlContent = xmlMenuNode.querySelector(':scope > Content');
        const xmlSubmenu = xmlMenuNode.querySelector(':scope > Submenu');
        const xmlOptions = xmlMenuNode.querySelector(':scope > Options');
        let elem: Element | null,
          isError = false;

        if ((mn.caption === '') && !isOnlyOneMenuNode) {
          pushLogEntry(draftState.logs, {
            slice: 'menus/primaryMenu',
            level: 'error',
            timestamp: Date.now(),
            text: `The menu node with ID "${id}" in <Menus><PrimaryMenu> in the configuration has no or an empty attribute "caption".`,
          });
          isError = true;
        }

        if (!xmlContent) {
          pushLogEntry(draftState.logs, {
            slice: 'menus/primaryMenu',
            level: 'error',
            timestamp: Date.now(),
            text: `The menu node with ID "${id}" in <Menus><PrimaryMenu> in the configuration has no node <Content>.`,
          });
          isError = true;
        }

        if (!xmlSubmenu) {
          pushLogEntry(draftState.logs, {
            slice: 'menus/primaryMenu',
            level: 'error',
            timestamp: Date.now(),
            text: `The menu node with ID "${id}" in <Menus><PrimaryMenu> in the configuration has no node <Submenu>.`,
          });
          isError = true;
        }

        // Build the menu node tree: an array with the IDs of this and all of its parent <MenuNode>
        // elements, starting with the parent menu node of the 1st level. Also start building the url
        // path for the menu node here.
        elem = xmlMenuNode;
        while (elem && (elem.tagName !== 'PrimaryMenu')) {
          if (elem.tagName === 'MenuNode') {
            const elemId = parseMenuNodeId(elem.getAttribute('id'));

            if (elemId === null) {
              pushLogEntry(draftState.logs, {
                slice: 'menus/primaryMenu',
                level: 'error',
                timestamp: Date.now(),
                text: `The menu node with ID "${id}" or one of its parent nodes in <Menus><PrimaryMenu> in the configuration has no or an empty attribute "id".`,
              });
              isError = true;
            } else {
              const elemUrlPathPart = elem.querySelector(':scope > UrlPathPart');

              if (!elemUrlPathPart) {
                pushLogEntry(draftState.logs, {
                  slice: 'menus/primaryMenu',
                  level: 'error',
                  timestamp: Date.now(),
                  text: `The menu node with ID "${elemId}" in <Menus><PrimaryMenu> in the configuration has no node <UrlPathPart>.`,
                });
                isError = true;
              } else if (elemUrlPathPart.textContent) {
                const urlPathPart = parseUrlPathPart(elemUrlPathPart.textContent);

                if (urlPathPart) {
                  mn.menuNodeTree.unshift(elemId);
                  mn.urlPath = `${urlPathPart}${mn.urlPath}`;
                } else {
                  pushLogEntry(draftState.logs, {
                    slice: 'menus/primaryMenu',
                    level: 'error',
                    timestamp: Date.now(),
                    text: `The content of node <UrlPathPart> of the menu node with ID "${elemId}" in <Menus><PrimaryMenu> in the configuration has invalid characters. Allowed: "A"-"Z", "a"-"z", "0"-"9", "-", "_", "." and "~".`,
                  });
                  isError = true;
                }
              } else {
                pushLogEntry(draftState.logs, {
                  slice: 'menus/primaryMenu',
                  level: 'error',
                  timestamp: Date.now(),
                  text: `The menu node with ID "${elemId}" in <Menus><PrimaryMenu> in the configuration has an empty node <UrlPathPart>.`,
                });
                isError = true;
              }
            }
          }

          elem = elem.parentElement;
        }

        if (!isError) {
          mn.level = mn.menuNodeTree.length;
          mn.icon = parseIcon(mn.icon, mn.level);

          if (mn.icon === null) {
            if (isOnlyOneMenuNode) {
              mn.icon = '';
            } else {
              pushLogEntry(draftState.logs, {
                slice: 'menus/primaryMenu',
                level: 'error',
                timestamp: Date.now(),
                text: `The menu node of the ${(mn.level === 1) ? '1st.' : '2nd.'} level with ID "${id}" in <Menus><PrimaryMenu> in the configuration has no or an empty attribute "icon".`,
              });
              isError = true;
            }
          }

          mn.contentPath = parseContentPath(xmlContent!.textContent) || '';

          for (const xmlSubmenuNode of Array.from(xmlSubmenu!.querySelectorAll(':scope > MenuNode'))) {
            const submenuNodeId = parseMenuNodeId(xmlSubmenuNode.getAttribute('id'));

            if (submenuNodeId === null) {
              pushLogEntry(draftState.logs, {
                slice: 'menus/primaryMenu',
                level: 'error',
                timestamp: Date.now(),
                text: `A submenu node of the menu node with ID "${id}" in <Menus><PrimaryMenu> in the configuration has no or an empty attribute "id".`,
              });
              isError = true;
            } else {
              mn.submenuNodeIds.push(submenuNodeId);
            }
          }

          if (!isError) {
            if (xmlOptions) {
              const { attributes } = xmlOptions;

              for (const attribute of attributes) {
                mn.options[attribute.name] = attribute.value;
              }
            }

            draftState.menuNodes.byId[mn.id] = mn;
            draftState.menuNodes.allIds.push(mn.id);
          }
        }
      }
    });
  }
};
