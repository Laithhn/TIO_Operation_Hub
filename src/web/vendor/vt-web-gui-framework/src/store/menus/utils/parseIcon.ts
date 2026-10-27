import { isNonEmptyString } from 'utils/type';


/**
 * Helper function to parse a given icon value in dependence of the given menu node level. An icon
 * alwalys must exist for all menu nodes of the 1st level. For primary menu nodes, an icon must also
 * exist for the 2nd level menu nodes. If a mandatory icon is invalid, null is retured.
 *
 * @param icon - The name of the icon of the menu node.
 * @param level - The level of the menu node within the menu tree, starts counting with 1 for the
 *   highest level of menu nodes.
 * @param isSecondaryMenu - Optionally set to true, if this function is used for the secondary menu.
 */
export const parseIcon = (icon: string | null, level: number, isSecondaryMenu = false): string | null => {
  if (isNonEmptyString(icon)) {
    return icon.toUpperCase();
  }

  if ((level > 2) || (isSecondaryMenu && (level === 2))) {
    return '';
  }
  return null;
};
