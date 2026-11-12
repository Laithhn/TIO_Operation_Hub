import type { I18nState } from '../i18n.types';


/**
 * Helper function to return the full language code as string of the first default language found in
 * the given state of the I18n slice. If there is no language marked as default, the code of the
 * first available language is taken and returned.
 */
export const findDefaultLanguageCode = (state: I18nState): string => (
  state.languages.allCodes.find((lc) => state.languages.byCode[lc]?.isDefault) ?? state.languages.allCodes[0]!
);
