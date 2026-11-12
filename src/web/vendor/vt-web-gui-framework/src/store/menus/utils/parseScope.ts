import type { ContentScope } from '../menus.types';


/**
 * Helper function to parse a given scope value of a menu node. For primary menu nodes, the returned
 * scope is always "main". For secondary menu nodes, "js", "blank" or "modwin" (default) is
 * returned.
 *
 * @param scope - The scope can also be a string.
 * @param isSecondaryMenu - Optionally set to true, if this function is used for the secondary menu.
 */
export const parseScope = (scope: string | undefined, isSecondaryMenu = false): ContentScope => {
  if (!isSecondaryMenu) {
    return 'main';
  }

  if ((scope === 'js') || (scope === 'blank')) {
    return scope;
  }

  return 'modwin';
};
