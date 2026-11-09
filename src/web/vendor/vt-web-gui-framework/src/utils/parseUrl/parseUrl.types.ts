export interface ParseUrlObject {
  /** The complete given URL. */
  href: string;
  /** The scheme of the URL: "http" (default), "https", "ftp", "ws" or "wss". */
  scheme: string;
  /** The authentication string <user>:<password> or an empty string, if not given. */
  auth: string;
  /** The username of the authentication string or an empty string, if not given. */
  user: string;
  /** The password of the authentication string or an empty string, if not given. */
  password: string;
  /** The host name without port number like "www.vitronic.de". */
  host: string;
  /** The port number or the default port number of the used scheme. */
  port: number;
  /** The URL path with leading slash and without query or fragment. If not given, an empty string
   * will be taken. */
  path: string;
  /** The complete query string with leading question mark or an empty string, if not given. */
  query: string;
  /** The query data as object of attribute-value pairs or an ampty object, if there is no query
   * string. */
  queryData: Record<string, string>;
  /** The fragment string with leading hash or an empty string, if not given. */
  fragment: string;
}
