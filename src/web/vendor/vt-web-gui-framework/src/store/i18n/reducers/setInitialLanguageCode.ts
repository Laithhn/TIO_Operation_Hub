import { createAsyncThunk } from '@reduxjs/toolkit';

import { isNonEmptyString } from 'utils/type';

import type { SetInitialLanguageCodePayload, SetInitialLanguageCodeThunkApi } from '../i18n.types';
import { findLanguage } from '../utils/findLanguage';
import { loadLanguageTable } from '../utils/loadLanguageTable';


/**
 * Async thunc reducer to try to set either one of the given initial language codes (optionally) or
 * one of the already stored initial language codes as the current language. Only during the
 * initialization phase.
 */
export const setInitialLanguageCode = createAsyncThunk<SetInitialLanguageCodePayload, string | (string | undefined)[] | undefined, SetInitialLanguageCodeThunkApi>(
  'VIWGF/i18n/setInitialLanguageCode',
  async (codes, thunkApi): Promise<SetInitialLanguageCodePayload> => {
    const i18nState = thunkApi.getState().i18n;
    const areInitialCodesGiven = (codes !== undefined);
    let language;

    const initialCodes = (Array.isArray(codes) ? codes : [codes]).filter<string>((code) => isNonEmptyString(code));

    // At first, try to find an existing language in the state by the optionally given language
    // codes.
    for (const initialCode of initialCodes) {
      language = findLanguage(i18nState, initialCode);
      if (language) {
        break;
      }
    }

    // If not found before, try to find a fitting language by the already stored initial codes.
    if (i18nState.initialCodes) {
      for (const initialCode of i18nState.initialCodes) {
        language = findLanguage(i18nState, initialCode);
        if (language) {
          break;
        }
      }
    }

    // If no fitting language can by found, take the default language (so there will always be a
    // language at the end).
    language ??= i18nState.languages.byCode[i18nState.defaultCode]!;

    // If a language table has already been loaded for the language found, then return here.
    if (i18nState.tables.allCodes.includes(language.code)) {
      return {
        ...(areInitialCodesGiven && { initialCodes }),
        code: language.code,
      };
    }

    // If a language table still needs to be loaded for the language found, then do this now...
    try {
      return {
        ...(areInitialCodesGiven && { initialCodes }),
        code: language.code,
        table: await loadLanguageTable(language),
      };
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw thunkApi.rejectWithValue({ error: `Trying to load the language table of language "${language.code}" from "${language.path}" in reducer "setInitialLanguageCode" failed: ${(e instanceof Error) ? e.message : String(e)}` });
    }
  },
  {
    condition: (_, { getState }) => {
      const i18nState = getState().i18n;
      return (i18nState.isInitialPhase && !i18nState.settingCode);
    },
  },
);
