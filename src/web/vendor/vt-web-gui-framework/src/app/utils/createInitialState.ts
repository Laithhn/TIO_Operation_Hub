import { parseStorageType } from 'interfaces/storageItf';
import { getAttributeInLowerCase, isAttributeTrue } from 'utils/element';

import type { AppState } from '../app.types';


/**
 * Function to set data of the given XML configuration to the partial Redux state of the slice by
 * mutating the given draft state.
 *
 * @param draftState - A mutable copy of the partial state of the slice.
 * @param config - The XML element of the configuration, conforming to schema file config.xsd. Some
 *   entries of this configuration are set to the partial state.
 */
export const createInitialState = (draftState: AppState, config: Element) => {
  // -----------------------------------------------------------------------------------------------
  // Read optional configuration node "Configuration > Common".
  // -----------------------------------------------------------------------------------------------

  const xmlCommon = config.querySelector(':scope > Common');

  if (xmlCommon) {
    // ---------------------------------------------------------------------------------------------
    // Read optional configuration node "Configuration > Common > DesktopApp".
    // ---------------------------------------------------------------------------------------------

    const xmlDesktopApp = xmlCommon.querySelector('DesktopApp');

    if (xmlDesktopApp) {
      const width = Number(xmlDesktopApp.getAttribute('width'));
      const height = Number(xmlDesktopApp.getAttribute('height'));
      const minWidth = Number(xmlDesktopApp.getAttribute('minWidth'));
      const minHeight = Number(xmlDesktopApp.getAttribute('minHeight'));

      if (minWidth >= 0) {
        draftState.desktopApp.minWidth = Math.round(minWidth);
      }

      if (minHeight >= 0) {
        draftState.desktopApp.minHeight = Math.round(minHeight);
      }

      draftState.desktopApp.width = Math.max(draftState.desktopApp.minWidth, (width >= 0) ? Math.round(width) : draftState.desktopApp.width);
      draftState.desktopApp.height = Math.max(draftState.desktopApp.minHeight, (height >= 0) ? Math.round(height) : draftState.desktopApp.height);
      draftState.desktopApp.storageType = parseStorageType(getAttributeInLowerCase(xmlDesktopApp, 'storageType'));
    }
  }

  // -----------------------------------------------------------------------------------------------
  // Read optional configuration node "Configuration > Sidebars > FirstSidebar".
  // -----------------------------------------------------------------------------------------------

  const xmlFirstSidebar = config.querySelector(':scope > Sidebars > FirstSidebar');

  if (xmlFirstSidebar) {
    draftState.isFirstSidebarEnabled = isAttributeTrue(xmlFirstSidebar, 'isEnabled');
  }

  // -----------------------------------------------------------------------------------------------
  // Read optional configuration node "Configuration > Sidebars > SecondSidebar".
  // -----------------------------------------------------------------------------------------------

  const xmlSecondSidebar = config.querySelector(':scope > Sidebars > SecondSidebar');

  if (xmlSecondSidebar) {
    draftState.isSecondSidebarEnabled = isAttributeTrue(xmlSecondSidebar, 'isEnabled');
  }

  // -----------------------------------------------------------------------------------------------
  // Read optional configuration node "Configuration > Footer".
  // -----------------------------------------------------------------------------------------------

  const xmlFooter = config.querySelector(':scope > Footer');

  if (xmlFooter) {
    draftState.isFooterEnabled = isAttributeTrue(xmlFooter, 'isEnabled');
  }

  // -----------------------------------------------------------------------------------------------
  // Read optional configuration node "Configuration > Menus".
  // -----------------------------------------------------------------------------------------------

  const xmlMenus = config.querySelector(':scope > Menus');

  if (xmlMenus) {
    switch (getAttributeInLowerCase(xmlMenus, 'appearance')) {
      case 'megamenu':
        draftState.menusAppearance = 'megaMenu';
        break;
      case 'burgermenu':
      case 'hamburgermenu':
        draftState.menusAppearance = 'hamburgerMenu';
        break;
      // no default
    }
  }
};
