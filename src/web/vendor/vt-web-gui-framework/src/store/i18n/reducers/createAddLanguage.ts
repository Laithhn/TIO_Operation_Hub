import type { ReducerCreators } from '@reduxjs/toolkit';

import { pushLogEntry } from 'store/pushLogEntry';

import type { AddLanguageAction, AddLanguageOptions, I18nState } from '../i18n.types';
import languagePresets from '../languagePresets.json';
import { buildLanguageTablePath } from '../utils/buildLanguageTablePath';
import { findDefaultLanguageCode } from '../utils/findDefaultLanguageCode';
import { parseLanguageCode } from '../utils/parseLanguageCode';


/**
 * Reducer creator to add one given and specified additional language to the list of available
 * languages. It is also possible, to edit the caption, format and / or default flag of an existing
 * language, if given and valid.
 */
export const createAddLanguage = (create: ReducerCreators<I18nState>) => create.preparedReducer(
  (code: string, {
    caption, rtl, format, isDefault,
  }: AddLanguageOptions = {}) => ({ payload: {
    code, caption, rtl, format, isDefault,
  } }),
  (state, { payload }: AddLanguageAction) => {
    const language = parseLanguageCode(payload.code);

    if (language) {
      if (state.languages.byCode[language.code]) {
        // -----------------------------------------------------------------------------------------
        // Edit an existing language (caption, format, path and isDefault only).
        // -----------------------------------------------------------------------------------------

        if (payload.caption) {
          state.languages.byCode[language.code]!.caption = payload.caption;
        }

        if (payload.format) {
          state.languages.byCode[language.code]!.format = payload.format;
          state.languages.byCode[language.code]!.path = buildLanguageTablePath(language.code, payload.format);
        }

        if (typeof payload.isDefault === 'boolean') {
          state.languages.byCode[language.code]!.isDefault = payload.isDefault;
        }
      } else {
        // -----------------------------------------------------------------------------------------
        // Add a new language at the end of the list.
        // -----------------------------------------------------------------------------------------

        const caption = (
          payload.caption
          || languagePresets[language.code]?.caption
          || languagePresets[language.isoCode]?.caption
          || language.code
        );
        const isRtl = (typeof payload.rtl === 'boolean')
          ? payload.rtl
          : (languagePresets[language.code]?.isRtl ?? languagePresets[language.isoCode]?.isRtl ?? false);
        const format = ((typeof payload.format === 'string') && (payload.format.trim().toLowerCase() === 'xml'))
          ? 'xml'
          : 'json';
        const path = buildLanguageTablePath(language.code, format);
        const isDefault = payload.isDefault ?? false;

        state.languages.byCode[language.code] = {
          ...language,
          caption,
          isRtl,
          format,
          path,
          isDefault,
          isAdditional: true,
        };
        state.languages.allCodes.push(language.code);
      }

      state.defaultCode = findDefaultLanguageCode(state);
    } else {
      pushLogEntry(state.logs, {
        slice: 'i18n',
        level: 'error',
        timestamp: Date.now(),
        text: `Adding an additional language in reducer "addLanguage" failed because the given language code "${payload.code}" seems to be invalid.`,
      });
    }
  },
);
