import { getUrlOfStaticSource } from 'utils/getUrlOfStaticSource';


/**
 * Helper function to build and return the path of the language table by a fully given language
 * code and by the desired suffix (e.g. "json" or "xml") of the table.
 */
export const buildLanguageTablePath = (code: string, suffix: string): string => (
  getUrlOfStaticSource(`${process.env['URL_I18N']}/${code}.${suffix}`)
);
