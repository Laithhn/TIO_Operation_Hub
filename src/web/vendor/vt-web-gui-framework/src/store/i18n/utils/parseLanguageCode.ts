import type { I18nLanguageCode } from '../i18n.types';


/**
 * Helper function to parse and check a given full language code. The returned object has three
 * fields: "code" is the trimmed and full language code in lower cases, "isoCode" is the first and
 * main part of the code, the ISO 639-1 code. "codeExt" is the extension after the ISO 639-1 code if
 * available, or an empty string if not. If the given language code is not valid, null is returned.
 */
export const parseLanguageCode = (code: string): I18nLanguageCode | null => {
  const res = /^(?<isoCode>[a-z0-9]+)(?:[_-]+(?<codeExt>.*))?$/.exec(code.trim().toLowerCase());

  if ((res?.length !== 3) || !res[1]) {
    return null;
  }

  return {
    code: res[0],
    isoCode: res[1],
    codeExt: res[2] || '',
  };
};
