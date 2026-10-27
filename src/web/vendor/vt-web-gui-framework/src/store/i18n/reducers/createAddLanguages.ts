import type { PayloadAction, ReducerCreators } from '@reduxjs/toolkit';

import { pushLogEntry } from 'store/pushLogEntry';
import { isNonEmptyString } from 'utils/type';

import type { I18nState } from '../i18n.types';
import languagePresets from '../languagePresets.json';
import { buildLanguageTablePath } from '../utils/buildLanguageTablePath';
import { findDefaultLanguageCode } from '../utils/findDefaultLanguageCode';
import { parseLanguageCode } from '../utils/parseLanguageCode';


/**
 * Reducer creator to add one or multiple additional languages to the list of available languages.
 * For all of the given languages, the caption and the rtl flag are detected automatically. The
 * format will always be "json" and the default flag will always be false.
 */
export const createAddLanguages = (create: ReducerCreators<I18nState>) => create.preparedReducer(
  (codes: string | string[]) => ({
    payload: (Array.isArray(codes) ? codes : [codes]).filter((code) => isNonEmptyString(code)),
  }),
  (state, { payload }: PayloadAction<string[]>) => {
    payload.forEach((code) => {
      const language = parseLanguageCode(code);

      if (!language) {
        pushLogEntry(state.logs, {
          slice: 'i18n',
          level: 'error',
          timestamp: Date.now(),
          text: `Adding an additional language in reducer "addLanguages" failed because the given language code "${code}" seems to be invalid.`,
        });
      } else if (!state.languages.byCode[language.code]) {
        state.languages.byCode[language.code] = {
          ...language,
          caption: (
            languagePresets[language.code]?.caption
            || languagePresets[language.isoCode]?.caption
            || language.code
          ),
          isRtl: languagePresets[language.code]?.isRtl ?? languagePresets[language.isoCode]?.isRtl ?? false,
          format: 'json',
          path: buildLanguageTablePath(language.code, 'json'),
          isDefault: false,
          isAdditional: true,
        };
        state.languages.allCodes.push(language.code);
      }
    });

    state.defaultCode = findDefaultLanguageCode(state);
  },
);
