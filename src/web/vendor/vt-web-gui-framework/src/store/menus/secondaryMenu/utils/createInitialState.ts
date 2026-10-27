import { systemSettings } from 'assets/defines';
import { pushLogEntry } from 'store/pushLogEntry';
import { getAttributeInLowerCase, isAttributeTrue } from 'utils/element';

import { parseContentPath } from '../../utils/parseContentPath';
import { parseIcon } from '../../utils/parseIcon';
import { parseMenuNodeId } from '../../utils/parseMenuNodeId';
import { parseScope } from '../../utils/parseScope';
import type { SecondaryMenuNode, SecondaryMenuState } from '../secondaryMenu.types';


/**
 * Function to set data of the given XML configuration to the partial Redux state of the slice by
 * mutating the given draft state.
 *
 * @param draftState - A mutable copy of the partial state of the slice.
 * @param config - The XML element of the configuration, conforming to schema file config.xsd. Some
 *   entries of this configuration are set to the partial state.
 */
export const createInitialState = (draftState: SecondaryMenuState, config: Element) => {
  // -----------------------------------------------------------------------------------------------
  // Read configuration node "Configuration > Menus > SecondaryMenu".
  // -----------------------------------------------------------------------------------------------

  const xmlSecondaryMenu = config.querySelector(':scope > Menus > SecondaryMenu');

  if (xmlSecondaryMenu) {
    // do for every secondary menu node..
    Array.from(xmlSecondaryMenu.querySelectorAll('MenuNode')).forEach((xmlMenuNode) => {
      const id = parseMenuNodeId(xmlMenuNode.getAttribute('id'));

      if (id === null) {
        pushLogEntry(draftState.logs, {
          slice: 'menus/secondaryMenu',
          level: 'error',
          timestamp: Date.now(),
          text: 'A menu node of <Menus><SecondaryMenu> in the configuration has no or an empty attribute "id".',
        });
      } else if (draftState.menuNodes.allIds.includes(id)) {
        pushLogEntry(draftState.logs, {
          slice: 'menus/secondaryMenu',
          level: 'error',
          timestamp: Date.now(),
          text: `The ID "${id}" is used for several menu nodes in <Menus><SecondaryMenu> in the configuration, but it has to be unique.`,
        });
      } else {
        const mn: SecondaryMenuNode = {
          id,
          caption: (xmlMenuNode.getAttribute('caption') ?? '').trim(),
          level: 1,
          icon: xmlMenuNode.getAttribute('icon'),
          isHidden: isAttributeTrue(xmlMenuNode, 'isHidden'),
          isDisabled: isAttributeTrue(xmlMenuNode, 'isDisabled'),
          isSpecialMenuNode: false,
          scope: parseScope(
            getAttributeInLowerCase(xmlMenuNode, 'scope'),
            true,
          ),
          ignoreAppearance: isAttributeTrue(xmlMenuNode, 'ignoreAppearance'),
          contentPath: '',
          menuNodeTree: [],
          submenuNodeIds: [],
          options: {
            modwinTitle: '',
            modwinWidth: 0,
            modwinHeight: 0,
            modwinIsDraggable: false,
            modwinIsResizable: false,
            modwinIsMinimizable: false,
            modwinIsUnclosable: false,
            modwinCloseByEscape: false,
            modwinMultiple: false,
            modwinIsExclusive: false,
            modwinDimmedBackground: false,
          },
        };
        const xmlContent = xmlMenuNode.querySelector(':scope > Content');
        const xmlSubmenu = xmlMenuNode.querySelector(':scope > Submenu');
        const xmlOptions = xmlMenuNode.querySelector(':scope > Options');
        let elem: Element | null,
          isError = false;

        if (!xmlContent) {
          pushLogEntry(draftState.logs, {
            slice: 'menus/secondaryMenu',
            level: 'error',
            timestamp: Date.now(),
            text: `The menu node with ID "${id}" in <Menus><SecondaryMenu> in the configuration has no node <Content>.`,
          });
          isError = true;
        }

        if (!xmlSubmenu) {
          pushLogEntry(draftState.logs, {
            slice: 'menus/secondaryMenu',
            level: 'error',
            timestamp: Date.now(),
            text: `The menu node with ID "${id}" in <Menus><SecondaryMenu> in the configuration has no node <Submenu>.`,
          });
          isError = true;
        }

        // Build the menu node tree: an array with the IDs of this and all of its parent "MenuNode"
        // elements, starting with the parent menu node of the 1st level.
        elem = xmlMenuNode;
        while (elem && (elem.tagName !== 'SecondaryMenu')) {
          if (elem.tagName === 'MenuNode') {
            const elemId = parseMenuNodeId(elem.getAttribute('id'));

            if (elemId === null) {
              pushLogEntry(draftState.logs, {
                slice: 'menus/secondaryMenu',
                level: 'error',
                timestamp: Date.now(),
                text: `The menu node with ID "${id}" or one of its parent nodes in <Menus><SecondaryMenu> in the configuration has no or an empty attribute "id".`,
              });
              isError = true;
            } else {
              mn.menuNodeTree.unshift(id);
            }
          }
          elem = elem.parentElement;
        }

        if (!isError) {
          mn.level = mn.menuNodeTree.length;
          mn.ignoreAppearance &&= (mn.level === 1);

          // special menu nodes are always 1st level menu nodes
          if ((mn.level === 1) && Object.values(systemSettings.specialMenuNodeIds).includes(mn.id)) {
            mn.isSpecialMenuNode = true;
          } else {
            if (mn.caption === '') {
              pushLogEntry(draftState.logs, {
                slice: 'menus/secondaryMenu',
                level: 'error',
                timestamp: Date.now(),
                text: `The menu node with ID "${id}" in <Menus><SecondaryMenu> in the configuration has no or an empty attribute "caption".`,
              });
              isError = true;
            }

            mn.icon = parseIcon(mn.icon, mn.level, true);
            if (mn.icon === null) {
              pushLogEntry(draftState.logs, {
                slice: 'menus/secondaryMenu',
                level: 'error',
                timestamp: Date.now(),
                text: `The menu node of the 1st. level with ID "${id}" in <Menus><SecondaryMenu> in the configuration has no or an empty attribute "icon".`,
              });
              isError = true;
            }

            mn.scope = parseScope(getAttributeInLowerCase(xmlMenuNode, 'scope'), true);
            mn.contentPath = parseContentPath(xmlContent!.textContent, mn.scope) || '';

            for (const xmlSubmenuNode of Array.from(xmlSubmenu!.querySelectorAll(':scope > MenuNode'))) {
              const submenuNodeId = parseMenuNodeId(xmlSubmenuNode.getAttribute('id'));

              if (submenuNodeId === null) {
                pushLogEntry(draftState.logs, {
                  slice: 'menus/secondaryMenu',
                  level: 'error',
                  timestamp: Date.now(),
                  text: `A submenu node of the menu node with ID "${id}" in <Menus><SecondaryMenu> in the configuration has no or an empty attribute "id".`,
                });
                isError = true;
              } else {
                mn.submenuNodeIds.push(submenuNodeId);
              }
            }
          }

          if (!isError) {
            if (xmlOptions) {
              const { attributes } = xmlOptions;
              const modwinMultiple = xmlOptions.getAttribute('modwinMultiple');

              mn.options.modwinTitle = xmlOptions.getAttribute('modwinTitle') ?? '';
              mn.options.modwinWidth = Number(xmlOptions.getAttribute('modwinWidth'));
              mn.options.modwinHeight = Number(xmlOptions.getAttribute('modwinHeight'));
              mn.options.modwinIsDraggable = isAttributeTrue(xmlOptions, 'modwinIsDraggable');
              mn.options.modwinIsResizable = isAttributeTrue(xmlOptions, 'modwinIsResizable');
              mn.options.modwinIsMinimizable = isAttributeTrue(xmlOptions, 'modwinIsMinimizable');
              mn.options.modwinIsUnclosable = isAttributeTrue(xmlOptions, 'modwinIsUnclosable');
              mn.options.modwinCloseByEscape = isAttributeTrue(xmlOptions, 'modwinCloseByEscape');

              if (modwinMultiple === 'true') {
                mn.options.modwinMultiple = true;
              } else if (modwinMultiple && (modwinMultiple !== 'false')) {
                mn.options.modwinMultiple = modwinMultiple;
              } else {
                mn.options.modwinMultiple = false;
              }

              mn.options.modwinIsExclusive = isAttributeTrue(xmlOptions, 'modwinIsExclusive');
              mn.options.modwinDimmedBackground = isAttributeTrue(xmlOptions, 'modwinDimmedBackground');

              for (const attribute of attributes) {
                const option = attribute.name;

                if (!option.startsWith('modwin')) {
                  mn.options[option] = attribute.value;
                }
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
