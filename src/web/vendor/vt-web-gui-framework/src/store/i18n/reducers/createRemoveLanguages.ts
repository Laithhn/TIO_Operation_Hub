import type { PayloadAction, ReducerCreators } from '@reduxjs/toolkit';

import { pushLogEntry } from 'store/pushLogEntry';
import { isNonEmptyString } from 'utils/type';

import type { I18nState } from '../i18n.types';
import { findDefaultLanguageCode } from '../utils/findDefaultLanguageCode';
import { parseLanguageCode } from '../utils/parseLanguageCode';


/**
 * Reducer creator to remove one, multiple or all additional languages from the list of available
 * languages. If all additional languages have to be removed, let the argument unset. If the current
 * language has to be removed too, it will be set new based on the following criteria:
 * - it is not an additional language,
 * - the language table is already loaded,
 * - first consider the default languages, then all others.
 */
export const createRemoveLanguages = (create: ReducerCreators<I18nState>) => create.preparedReducer(
  (codes?: string | string[]) => ({
    payload: codes ? (Array.isArray(codes) ? codes : [codes]).filter((code) => isNonEmptyString(code)) : null,
  }),
  (state, { payload }: PayloadAction<string[] | null>) => {
    const codes = (payload === null)
      ? null
      : payload.reduce<string[]>((acc, code) => {
        const language = parseLanguageCode(code);

        if (!language) {
          pushLogEntry(state.logs, {
            slice: 'i18n',
            level: 'error',
            timestamp: Date.now(),
            text: `Removing an additional language in reducer "removeLanguages" failed because the given language code "${code}" seems to be invalid.`,
          });
          return acc;
        }
        return [...acc, language.code];
      }, []);

    const allCodes = state.languages.allCodes.filter((lc) => (
      !state.languages.byCode[lc]!.isAdditional
      || ((codes !== null) && !codes.includes(lc))
    ));

    if (allCodes.length !== state.languages.allCodes.length) {
      state.languages.byCode = state.languages.allCodes.reduce((acc, lc) => ({
        ...acc,
        [lc]: state.languages.byCode[lc],
      }), {});
      state.languages.allCodes = allCodes;
      state.defaultCode = findDefaultLanguageCode(state);

      if (!state.languages.allCodes.includes(state.code)) {
        // If the current language was also removed, try to find the new one. It has to be not
        // additional and its table has already be loaded. In the first step, try to find a
        // default language. If not found, take the first available one.
        state.code = state.languages.allCodes.find((lc) => (
          !state.languages.byCode[lc]!.isAdditional
          && state.languages.byCode[lc]!.isDefault
          && state.tables.allCodes.includes(lc)
        )) ?? state.languages.allCodes.find((lc) => (
          !state.languages.byCode[lc]!.isAdditional
          && state.tables.allCodes.includes(lc)
        ))!;
      }
    }
  },
);
