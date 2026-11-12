/**
 * Exported function to convert and return a given string into camel case, where the first letter is
 * capitalized: UpperCamelCase.
 */
export const toUpperCamelCase = (str: string): string => str
  .replace(/^\w|[-_\s]+\w?/g, (match) => match.toUpperCase().replace(/[-_\s]/g, ''));
