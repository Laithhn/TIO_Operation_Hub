import { getSpaceKeyFromValue, layout } from 'assets/styles';


/** The rounding every popup world of a control carries, taken from the one place that states it.
 * The card takes a spacing key rather than a pixel value, so the value is translated back into its
 * key. The menu and every submenu it opens read it here, each of them being a card of its own. */
export const borderRadiusKey = getSpaceKeyFromValue(layout.controlMenus.borderRadius);
