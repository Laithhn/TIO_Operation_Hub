/**
 * Exported function to convert and return a given string into camel case, where the first letter is
 * not capitalized: lowerCamelCase.
 */
export const toLowerCamelCase = (str: string): string => str
  .replace(/[-_\s]+\w?/g, (match) => match.replace(/[-_\s]/g, '').toUpperCase())
  .replace(/^\w/, (match) => match.toLowerCase());
