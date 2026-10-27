/**
 * Exported function to convert a string into camel case, where the first letter is capitalized:
 * UpperCamelCase.
 *
 * @param {string} str - The string to convert.
 * @returns {string}
 */
const toUpperCamelCase = (str) => str
  .replace(/(^[\w]|[-_\s]+[\w]?)/g, ($1) => $1.toUpperCase().replace(/[-_\s]/g, ''));

export default toUpperCamelCase;
