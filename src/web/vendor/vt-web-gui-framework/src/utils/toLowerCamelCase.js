/**
 * Exported function to convert a string into camel case, where the first letter is not capitalized:
 * lowerCamelCase.
 *
 * @param {string} str - The string to convert.
 * @returns {string}
 */
const toLowerCamelCase = (str) => str
  .replace(/([-_\s]+[\w]?)/g, ($1) => $1.replace(/[-_\s]/g, '').toUpperCase())
  .replace(/(^[\w])/, ($1) => $1.toLowerCase());

export default toLowerCamelCase;
