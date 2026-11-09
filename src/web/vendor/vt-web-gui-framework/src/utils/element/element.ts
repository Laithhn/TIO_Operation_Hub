/**
 * Function to convert and return the value of a given attribute of a given element into a trimmed
 * string.
 *
 * @param elem - An element like XML or HTML of type Element.
 * @param attr - The name of the attribute.
 * @param defaultValue - The default value, if the attribute is invalid. Default: empty string.
 */
export const getTrimmedAttribute = (elem: Element, attr: string, defaultValue = '') => (
  (elem.getAttribute(attr) ?? defaultValue).trim()
);


/**
 * Function to convert and return the value of a given attribute of a given element into a trimmed
 * string in lower cases.
 *
 * @param elem - An element like XML or HTML of type Element.
 * @param attr - The name of the attribute.
 * @param defaultValue - The default value, if the attribute is invalid. Default: empty string.
 */
export const getAttributeInLowerCase = (elem: Element, attr: string, defaultValue = ''): string => (
  getTrimmedAttribute(elem, attr, defaultValue).toLowerCase()
);


/**
 * Function to convert and return the value of a given attribute of a given element into a trimmed
 * string in upper cases.
 *
 * @param elem - An element like XML or HTML of type Element.
 * @param attr - The name of the attribute.
 * @param defaultValue - The default value, if the attribute is invalid. Default: empty string.
 */
export const getAttributeInUpperCase = (elem: Element, attr: string, defaultValue = ''): string => (
  getTrimmedAttribute(elem, attr, defaultValue).toUpperCase()
);


/**
 * Function that returns true, if the value of a given attribute of a given element is "true" (case
 * insensitive) or false if not.
 *
 * @param elem - An element like XML or HTML of type Element.
 * @param attr - The name of the attribute.
 */
export const isAttributeTrue = (elem: Element, attr: string): boolean => (
  getAttributeInLowerCase(elem, attr) === 'true'
);
