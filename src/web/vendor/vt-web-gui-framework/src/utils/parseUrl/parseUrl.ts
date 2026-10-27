import type { ParseUrlObject } from './parseUrl.types';


const defaultPorts = {
  http: 80,
  https: 443,
  ftp: 21,
  ws: 80,
  wss: 443,
};


/**
 * Exported function to split a given URL into its parts and return this parts as object. At the
 * moment, only the URL schemes "http", "https", "ftp", "ws", "wss", "mailto" and "file" are
 * supported. If the scheme is "file", only the fields "href", "scheme" and "path" of the returning
 * object are set. If the scheme is "mailto", only the fields "href", "scheme", "user" and "host" of
 * the returning object are set.
 */
export const parseUrl = (url: string): ParseUrlObject => {
  const u = (typeof url === 'string') ? url.trim().toLowerCase() : '';
  const urlObj: ParseUrlObject = {
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

  if (u.startsWith('file')) {
    // ---------------------------------------------------------------------------------------------
    // parse web urls: file
    // ---------------------------------------------------------------------------------------------

    const { path } = /^file:\/+(?<path>[/\\\w-.:%]+)?/.exec(u)?.groups ?? {};

    if (path) {
      urlObj.href = u;
      urlObj.scheme = 'file';
      urlObj.path = path;
    }
  } else if (u.startsWith('mailto')) {
    // ---------------------------------------------------------------------------------------------
    // parse web urls: mailto
    // ---------------------------------------------------------------------------------------------

    const { user, host } = /^mailto:(?<user>[/\\\w-.!]+)@(?<host>[\w-.]+)/.exec(u)?.groups ?? {};

    if (user && host) {
      urlObj.href = u;
      urlObj.scheme = 'mailto';
      urlObj.user = user;
      urlObj.host = host;
    }
  } else {
    // ---------------------------------------------------------------------------------------------
    // parse web urls: http, https, ftp, ws, wss, ...
    // ---------------------------------------------------------------------------------------------

    const {
      scheme, auth, user, password, host, port, path, query, fragment,
    } = /^(?:(?<scheme>https?|ftp|wss?):\/\/)?(?:(?<auth>(?<user>[\w-.!]+)(?::(?<password>[\w-.!]+))?)@)?(?<host>[\w-.]+)(?::(?<port>\d+))?(?<path>[/\w-+.%]+)?(?<query>\?[\w-+.,%=&]+)?(?<fragment>#.+)?/.exec(u)?.groups ?? {};

    if (host) {
      urlObj.href = u;
      urlObj.scheme = scheme ?? 'http';
      urlObj.auth = auth ?? '';
      urlObj.user = user ?? '';
      urlObj.password = password ?? '';
      urlObj.host = host;
      urlObj.port = (port ? Number(port) : (defaultPorts[urlObj.scheme.toLowerCase() as keyof typeof defaultPorts]));
      urlObj.path = path ?? '';
      urlObj.query = query ?? '';
      urlObj.fragment = fragment ?? '';

      if (urlObj.query !== '') {
        urlObj.query.substring(1).split('&').forEach((param) => {
          const parts = param.split('=');
          if (parts[0]) {
            urlObj.queryData[parts[0]] = (parts.length > 1) ? parts[1] ?? '' : '';
          }
        });
      }
    }
  }

  return urlObj;
};
