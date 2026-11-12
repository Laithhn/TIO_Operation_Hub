import type { I18nLanguage, I18nState } from '../i18n.types';


/**
 * Helper function to return the data object of a language of the given state of the I18n slice,
 * selected by a given language code. If no language is found, null is returned.
 */
export const findLanguage = (state: I18nState, code: string): I18nLanguage | null => {
  let language;

  const languageCode = code.trim().toLowerCase();
  language = state.languages.byCode[languageCode] ?? null;

  if (!language) {
    // split the language code into parts, like "en_us..." so "en" will be splitPart[1] and
    // "us..." will be splitPart[2]
    const { isoCode, codeExt } = /^(?<isoCode>[a-z0-9]+)(?:[_-]+(?<codeExt>.*))?$/.exec(languageCode)?.groups ?? {};

    if (!isoCode) {
      return null;
    }

    state.languages.allCodes.some((lc) => {
      const l = state.languages.byCode[lc]!;

      if (
        (l.isoCode === isoCode)
        && ((l.codeExt === '') || !codeExt)
      ) {
        language = l;
        return true;
      }

      return false;
    });
  }

  return language;
};
