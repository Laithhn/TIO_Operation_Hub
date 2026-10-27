import type { ReducerCreators } from '@reduxjs/toolkit';

import { pushLogEntry } from 'store/pushLogEntry';
import type { RootState } from 'store/store.types';

import type { I18nState, SetLanguageCodePayload, SetLanguageCodeThunkApi } from '../i18n.types';
import { findLanguage } from '../utils/findLanguage';
import { loadLanguageTable } from '../utils/loadLanguageTable';


/**
 * Async thunk reducer creator to try to set the current language by the given code. At first, a
 * check is made to see if a language exists where the full language code matches. If not, determine
 * a language without considering the extension of the language code. Examples: a given "en" matches
 * with "en-gb" if there is no language "en". A given "en-us" matches with "en" if no "en-us"
 * exists, but a given "en-gb" does not match with "en-us". If no language is found by the given
 * language code, nothing is changed. If necessary, the corresponding language table of the
 * determined language code is loaded from a language file.
 */
export const createSetLanguageCode = (create: ReducerCreators<I18nState>) => (
  create.asyncThunk<SetLanguageCodePayload, string, SetLanguageCodeThunkApi>(
    async (code, thunkApi): Promise<SetLanguageCodePayload> => {
      const i18nState = (thunkApi.getState() as RootState).i18n;
      const language = findLanguage(i18nState, code)!; // language exists here, see condition

      // If a language table has already been loaded for the language found, then only set the
      // language as the current one.
      if (i18nState.tables.allCodes.includes(language.code)) {
        return {
          code: language.code,
        };
      }

      // If a language table still needs to be loaded for the language found, do it now and after
      // that, set the language as the current one.
      try {
        return {
          code: language.code,
          table: await loadLanguageTable({ path: language.path, format: language.format }),
        };
      } catch (e) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw thunkApi.rejectWithValue({ error: `Trying to load the language table of language "${language.code}" from ${language.path} in reducer "setLanguageCode" failed: ${(e instanceof Error) ? e.message : String(e)}` });
      }
    },
    {
      options: {
        condition: (code: string, { getState }): boolean => {
          const i18nState = (getState() as RootState).i18n;
          return !i18nState.settingCode && !!findLanguage(i18nState, code);
        },
      },
      pending: (state) => {
        state.settingCode = true;
      },
      fulfilled: (state, { payload: { code, table } }) => {
        state.isInitialPhase = false;
        state.code = code;

        if (table) {
          state.tables.byCode[code] = table;
          state.tables.allCodes = Object.keys(state.tables.byCode);
        }
      },
      rejected: (state, { payload }) => {
        pushLogEntry(state.logs, {
          slice: 'i18n',
          level: 'error',
          timestamp: Date.now(),
          text: payload?.error || 'Reject setting a given language code in reducer "setLanguageCode" with an unknown error.',
        });
      },
      settled: (state) => {
        state.settingCode = false;
      },
    },
  )
);
