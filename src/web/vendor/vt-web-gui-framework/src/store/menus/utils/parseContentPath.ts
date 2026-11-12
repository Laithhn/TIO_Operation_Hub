import { normalizeUrlPath } from 'utils/normalizeUrlPath';

import type { ContentScope } from '../menus.types';


/**
 * Helper function to parse a given content path of a menu node: trim it, replace backslahes by
 * slashes and remove multiple slashes. Also ensure that there is a leading slash and no trailing
 * slash, but a file name content.js, content.ts, content.jsx or content.tsx (default), depending on
 * the given scope. If the given path is an URL (starts with "http://" or "https://"), it is only
 * trimmed at the end.
 */
export const parseContentPath = (contentPath: string | null, scope: ContentScope = 'main'): string | null => {
  if (!contentPath) {
    return null;
  }

  if (/^https?:\/\//i.test(contentPath)) {
    return contentPath.trimEnd();
  }

  let ret = normalizeUrlPath(contentPath, { leadingSlash: true, trailingSlash: false });

  if (!/\/content.[jt]sx?$/i.test(ret)) {
    ret = (scope === 'js') ? `${ret}/content.ts` : `${ret}/content.tsx`;
  }

  return ret;
};
