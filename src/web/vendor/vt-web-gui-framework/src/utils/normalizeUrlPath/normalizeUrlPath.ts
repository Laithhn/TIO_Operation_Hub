/**
 * Exported function to normalize a given URL path: it will be trimmed, backslashes are replaced by
 * slashes and double slashes are removed. If the given path is not a string, an empty string is
 * returned.
 *
 * @param urlPath - The given URL path to normalize.
 * @param leadingSlash - Set to true to force a leading slash or to false to suppress a leading slash.
 * @param trailingSlash - Set to true to force a trailing slash or to false to suppress a trailing
 *   slash.
 * @param encode - Set to true to finally encode the path.
 */
export const normalizeUrlPath = (urlPath: string, {
  leadingSlash,
  trailingSlash,
  encode = false,
}: {
  leadingSlash?: boolean;
  trailingSlash?: boolean;
  encode?: boolean;
} = {
  encode: false,
}) => {
  if (typeof urlPath !== 'string') {
    return '';
  }

  let path = urlPath.trim() //  always trim
    .replace(/\\/g, '/') // replace backslashes by slashes
    .replace(/\/{2,}/g, '/'); // remove double slashes

  // handle leading slash
  if (path.startsWith('/')) {
    if (leadingSlash === false) {
      path = path.replace(/^\//, '');
    }
  } else if (leadingSlash === true) {
    path = `/${path}`;
  }

  // handle trailing slash
  if (path.endsWith('/') && (path !== '/')) {
    if (trailingSlash === false) {
      path = path.replace(/\/$/, '');
    }
  } else if (trailingSlash === true) {
    path = `${path}/`;
  }

  if (encode) {
    return encodeURI(path);
  }

  return path;
};
