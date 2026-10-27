/**
 * Helper function to parse a given partial URL path (the part between two slashes). If it is valid,
 * the part is returned with leading slash. If it is invalid, null is returned. Allowed characters:
 * "A"-"Z", "a"-"z", "0"-"9", "-", "_", "." and "~".
 *
 * @param urlPathPart - The given partial URL path.
 */
export const parseUrlPathPart = (urlPathPart: string | null): string | null => {
  if ((typeof urlPathPart === 'string') && /^[\w-.~]+$/.test(urlPathPart)) {
    return `/${urlPathPart}`;
  }
  return null;
};
