import { normalizeUrlPath } from 'utils/normalizeUrlPath';


/**
 * Helper function to parse a given content path of a menu node: trim it, replace backslahes by
 * slashes and remove multiple slashes. Also ensure that there is a leading slash and no trailing
 * slash, but a file name content.jsx or content.tsx (default).
 */
export const parseContentPath = (contentPath: string): string => {
  let ret = normalizeUrlPath(contentPath, { leadingSlash: true, trailingSlash: false });

  if (!/\/content.[jt]sx$/i.test(ret)) {
    ret = `${ret}/content.tsx`;
  }

  return ret;
};
