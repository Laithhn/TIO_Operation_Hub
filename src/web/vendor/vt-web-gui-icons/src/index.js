import icons from './assets/icons.json';


export const { viewbox } = icons;
export const allIconNames = Object.keys(icons.collection);


/**
 * Exported function that returns true, if an icon, selected by its name exists or false if not.
 *
 * @param {string} iconName - The name of the icon, case insensitive.
 *
 * @return {boolean}
 */
export const iconExists = (iconName) => (
  (typeof iconName === 'string')
  && !!icons.collection[iconName.toUpperCase()]
);


/**
 * Exported function to return the SVG path of an icon, selected by the name of the icon. If the
 * icon name is invalid, undefined is returned.
 *
 * @param {string} iconName - The name of the icon, case insensitive.
 *
 * @return {string}
 */
export const getIconPath = (iconName) => icons.collection[iconName.toUpperCase()]?.svgPath;


/**
 * Exported function to return an array with some optional keywords of an icon, selected by the name
 * of the icon. If the icon name is invalid, undefined is returned.
 *
 * @param {string} iconName - The name of the icon.
 *
 * @return {string[]}
 */
export const getIconKeywords = (iconName) => icons.collection[iconName.toUpperCase()]?.keywords;
