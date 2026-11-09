import type { I18nLanguageTable } from '../i18n.types';


/**
 * Helper function to translate a given key by a given language table.
 *
 * @param table - The language table to use for the translation.
 * @param key - The key of the searched entry in the language table.
 * @param params - Optionally an array with parameters, to replace placeholders like %0, %1 and so
 *   on in the text.
 */
export const translateText = (table: I18nLanguageTable | null, key: string, params?: string | number | (string | number)[]): string => {
  const value = table?.[key] ?? key;

  if (params === undefined) {
    return value;
  }

  if (Array.isArray(params) && (params.length > 0)) {
    return params.reduce((text: string, param, i) => (
      text.replace(new RegExp(`%${i}`, 'g'), String(param))
    ), value);
  }

  if ((typeof params === 'string') || (typeof params === 'number')) {
    return value.replace(/%0/, String(params));
  }

  return value;
};
