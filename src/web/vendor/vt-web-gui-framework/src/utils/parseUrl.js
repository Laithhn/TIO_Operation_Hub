const DefaultPorts = {
  HTTP: 80,
  HTTPS: 443,
  FTP: 21,
  WS: 80,
  WSS: 443,
};


/**
 * Exported function to normalize a given URL path: it will be trimmed, backslashes are replaced by
 * slashes and double slashes are removed. If the given path is not a string, an empty string is
 * returned.
 *
 * @param {string} urlPath - The given URL path to normalize.
 * @param {object} [options] - Optional settings.
 * @param {boolean} [options.leadingSlash] - Set to true to force a leading slash or to false to
 *   suppress a leading slash.
 * @param {boolean} [options.trailingSlash] - Set to true to force a trailing slash or to false to
 *   suppress a trailing slash.
 * @param {boolean} [options.encode=false] - Set to true to finally encode the path.
 * @returns {string}
 */
export const normalizeUrlPath = (urlPath, {
  leadingSlash,
  trailingSlash,
  encode = false,
} = {
  leadingSlash: undefined,
  trailingSlash: undefined,
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


/**
 * @typedef {object} ParseUrlObject
 * @property {string} href - The complete given URL.
 * @property {string} scheme - The scheme of the URL: "http" (default), "https", "ftp", "ws" or "wss".
 * @property {string} auth - The authentication string <user>:<password> or an empty string, if not given.
 * @property {string} user - The username of the authentication string or an empty string, if not given.
 * @property {string} password - The password of the authentication string or an empty string, if not given.
 * @property {string} host - The host name without port number like "www.vitronic.de".
 * @property {number} port - The port number or the default port number of the used scheme.
 * @property {string} path - The URL path with leading slash and without query or fragment. If not given, an empty string will be taken.
 * @property {string} query - The complete query string with leading question mark or an empty string, if not given.
 * @property {object} queryData - The query data as object of attribute-value pairs or an ampty object, if there is no query string.
 * @property {string} fragment - The fragment string with leading hash or an empty string, if not given.
 */

/**
 * Exported function to split a given URL into its parts and return this parts as object. At the
 * moment, only the URL schemes "http", "https", "ftp", "ws", "wss", "mailto" and "file" are
 * supported. If the scheme is "file", only the fields "href", "scheme" and "path" of the returning
 * object are set. If the scheme is "mailto", only the fields "href", "scheme", "user" and "host" of
 * the returning object are set.
 *
 * @param {string} url - The URL.
 * @returns {ParseUrlObject}
 */
const parseUrl = (url) => {
  const u = (typeof url === 'string') ? url.trim().toLowerCase() : '';
  const urlObj = {
    href: '',
    scheme: '',
    auth: '',
    user: '',
    password: '',
    host: '',
    port: NaN,
    path: '',
    query: '',
    queryData: {},
    fragment: '',
  };

  if (u.substring(0, 4) === 'file') {
    // ---------------------------------------------------------------------------------------------
    // parse web urls: file
    // ---------------------------------------------------------------------------------------------

    const res = u.match(/^file:\/+([/\\\w-.:%]+)?/);

    if (res && (res.length === 2)) {
      urlObj.href = res || '';
      urlObj.scheme = 'file';
      urlObj.path = res[1] || '';
    }
  } else if (u.substring(0, 6) === 'mailto') {
    // ---------------------------------------------------------------------------------------------
    // parse web urls: mailto
    // ---------------------------------------------------------------------------------------------

    const res = u.match(/^mailto:([/\\\w-.!]+)@([\w-.]+)/);

    if (res && (res.length === 3)) {
      urlObj.href = res[0] || '';
      urlObj.scheme = 'mailto';
      urlObj.user = res[1] || '';
      urlObj.host = res[2] || '';
    }
  } else {
    // ---------------------------------------------------------------------------------------------
    // parse web urls: http, https, ftp, ws, wss, ...
    // ---------------------------------------------------------------------------------------------

    const res = u.match(/^(?:(https?|ftp|wss?):\/\/)?(?:(([\w-.!]+)(?::([\w-.!]+))?)@)?([\w-.]+)(?::(\d+))?([/\w-+.%]+)?(\?[\w-+.,%=&]+)?(#.+)?/);

    if (res && (res.length === 10)) {
      urlObj.href = res[0] || '';
      urlObj.scheme = res[1] || 'http';
      urlObj.auth = res[2] || '';
      urlObj.user = res[3] || '';
      urlObj.password = res[4] || '';
      urlObj.host = res[5] || '';
      urlObj.port = (res[6] ? parseInt(res[6], 10) : (DefaultPorts[urlObj.href.toUpperCase()]));
      urlObj.path = res[7] || '';
      urlObj.query = res[8] || '';
      urlObj.fragment = res[9] || '';

      if (urlObj.query !== '') {
        urlObj.query.substring(1).split('&').forEach((param) => {
          const parts = param.split('=');
          urlObj.queryData[parts[0]] = (parts.length > 1) ? parts[1] : '';
        });
      }
    }
  }

  return urlObj;
};

export default parseUrl;
