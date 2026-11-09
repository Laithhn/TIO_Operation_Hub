import {
  asyncThunkCreator, buildCreateSlice, createSelector, type PayloadAction,
} from '@reduxjs/toolkit';

import { systemSettings } from 'assets/defines';
import { StorageItf, StorageType } from 'interfaces/storageItf';
import { enhancedReducerCreator } from 'store/enhancedReducerCreator';
import { startInitialListener, startListening } from 'store/listenerMiddleware';
import { pushLogEntry } from 'store/pushLogEntry';
import type { LogEntry } from 'store/store.types';
import { parseUrl } from 'utils/parseUrl';

import type { I18nState } from './i18n.types';
import { createAddLanguage } from './reducers/createAddLanguage';
import { createAddLanguages } from './reducers/createAddLanguages';
import { createRemoveLanguages } from './reducers/createRemoveLanguages';
import { createSetLanguageCode } from './reducers/createSetLanguageCode';
import { setInitialLanguageCode } from './reducers/setInitialLanguageCode';
import { createInitialState } from './utils/createInitialState';
import { findLanguage } from './utils/findLanguage';
import { translateDate } from './utils/translateDate';
import { translateText } from './utils/translateText';


const initialState: I18nState = {
  ignoreBrowserLanguage: false,
  storageType: StorageType.internal,
  isInitialPhase: true,
  initialCodes: null,
  defaultCode: '',
  code: '',
  settingCode: false,
  languages: {
    byCode: {},
    allCodes: [],
  },
  tables: {
    byCode: {},
    allCodes: [],
  },
  logs: [],
};

let storage: StorageItf<string> | undefined;


/**
 * Redux Toolkit slice that handles the partial state of the internationalization. This slice is
 * exported as default below.
 */
const slice = buildCreateSlice({ creators: { asyncThunk: asyncThunkCreator } })({
  name: 'VIWGF/i18n',
  reducerPath: 'i18n',
  initialState,

  reducers: (create) => ({
    /**
     * Reducer to add one given and specified additional language to the list of available
     * languages. It is also possible, to edit the caption, format and / or default flag of an
     * existing language, if given and valid.
     */
    addLanguage: createAddLanguage(create),


    /**
     * Reducer to add one or multiple additional languages to the list of available languages. For
     * all of the given languages, the caption and the rtl flag are detected automatically. The
     * format will always be "json" and the default flag will always be false.
     */
    addLanguages: createAddLanguages(create),


    /**
     * Reducer to remove one, multiple or all additional languages from the list of available
     * languages. If all additional languages have to be removed, let the argument unset. If the
     * current language has to be removed too, it will be set new based on the following criteria:
     * - it is not an additional language,
     * - the language table is already loaded,
     * - first consider the default languages, then all others.
     */
    removeLanguages: createRemoveLanguages(create),


    /**
     * Async thunk reducer to try to set the current language by the given code. At first, a check
     * is made to see if a language exists where the full language code matches. If not, determine
     * a language without considering the extension of the language code. Examples: a given "en"
     * matches with "en-gb" if there is no language "en". A given "en-us" matches with "en" if no
     * "en-us" exists, but a given "en-gb" does not match with "en-us". If no language is found by
     * the given language code, nothing is changed. If necessary, the corresponding language table
     * of the determined language code is loaded from a language file.
     */
    setLanguageCode: createSetLanguageCode(create),


    /**
     * Reducer to set a log entry from the internationalization middleware.
     */
    addLogEntry: create.reducer((state, { payload }: PayloadAction<Pick<LogEntry, 'level' | 'timestamp' | 'title' | 'text'>>) => {
      pushLogEntry(state.logs, {
        slice: 'i18n',
        ...payload,
      });
    }),
  }),


  extraReducers: (builder) => {
    builder
      .addCase(setInitialLanguageCode.pending, (state) => {
        state.settingCode = true;
      })
      .addCase(setInitialLanguageCode.fulfilled, (state, { payload: { initialCodes, code, table } }) => {
        if (initialCodes) {
          state.initialCodes = initialCodes;
        }
        state.code = code;

        if (table) {
          state.tables.byCode[code] = table;
          state.tables.allCodes = Object.keys(state.tables.byCode);
        }
      })
      .addCase(setInitialLanguageCode.rejected, (state, { payload }) => {
        pushLogEntry(state.logs, {
          slice: 'i18n',
          level: 'error',
          timestamp: Date.now(),
          text: payload?.error || 'Reject setting initial language codes in reducer "setInitialLanguageCode" with an unknown error.',
        });
      })
      .addMatcher(setInitialLanguageCode.settled, (state) => {
        state.settingCode = false;
      });
  },


  selectors: {
    /**
     * Selector that returns true when the internationalization is initialized and ready to use.
     */
    selectIsReady: (state: I18nState) => (state.code !== ''),


    /**
     * Selector to return the configured storage type of the internationalization.
     */
    selectStorageType: (state: I18nState) => state.storageType,


    /**
     * Selector to return true, if the current language of the used browser is not considered as
     * initial language.
     */
    selectIsBrowserLanguageIgnored: (state: I18nState) => state.ignoreBrowserLanguage,


    /**
     * Selector that return true, if the system is in the initalisation phase, where the initial
     * languages will be used every time to set the current language code, when new languages are
     * added or removed. The initial phase ends (set to false) when setting the language code is
     * done the first time by the user.
     */
    selectIsInitializing: (state: I18nState) => state.isInitialPhase,


    /**
     * Selector to return a list of the initial language codes or null if they are not yet set.
     */
    selectInitialLanguageCodes: (state: I18nState) => state.initialCodes,


    /**
     * Selector to get the current language code.
     */
    selectCurrentLanguageCode: (state: I18nState) => state.code,


    /**
     * Selector to return true, if the direction of the current language is right-to-left or false
     * if not.
     */
    selectIsCurrentLanguageRtl: (state: I18nState) => (!!state.code && state.languages.byCode[state.code]!.isRtl),


    /**
     * Selector to return a memorized array of objects with the data of all available languages.
     */
    selectAllLanguages: createSelector(
      (state: I18nState) => state.languages.byCode,
      (state: I18nState) => state.languages.allCodes,
      (byCode, allCodes) => allCodes.map((lc) => byCode[lc]!),
    ),


    /**
     * Selector to return the data object of a language selected by a given language code. If no
     * language is found, null is returned.
     */
    selectLanguage: (state: I18nState, code: string) => findLanguage(state, code),


    /**
     * Selector to return the data object of the first language that is marked as the default
     * language. If no language is marked as default, the data object of the first language is
     * returned. So there is always a language returned.
     */
    selectDefaultLanguage: (state: I18nState) => state.languages.byCode[state.defaultCode]!,


    /**
     * Selector to return a memoized object with the number of entries of all loaded language
     * tables. The keys are the language codes.
     */
    selectNumOfLanguageTableEntries: createSelector(
      (state: I18nState) => state.tables.allCodes,
      (state: I18nState) => state.tables.byCode,
      (allCodes, byCode) => allCodes.reduce((acc, lc) => ({
        ...acc,
        [lc]: Object.keys(byCode[lc]!).length,
      }), {}),
    ),


    /**
     * Selector to return a memorized object with some internationalization tools:
     * \{ languageCode: string, isRtl: boolean, translateText: function, translateDate: function \}.
     * Function "translateText" is to translate a given key (1st argument). The 2nd optional
     * argument is an array with parameters, to replace placeholders like %0, %1 and so on in the
     * text. Function "translateDate" is to format the date and time of the given Date object or of
     * a given UNIX timestamp (1st argument) into a string with a given format (2nd argument). The
     * format is leaned on PHP function date(). Set the 3rd optional argument to true, to use the
     * UTC date and time of the given Date object / timestamp, set to false, to use the local time
     * zone of the browser or set to an IANA time zone string like "Asia/Shanghai" to use this one.
     */
    selectTools: createSelector(
      (state: I18nState) => state.code,
      (state: I18nState) => (!!state.code && state.languages.byCode[state.code]!.isRtl),
      (state: I18nState) => state.tables.byCode[state.code] ?? null,
      (languageCode, isRtl, languageTable) => ({
        languageCode,
        isRtl,
        translateText: (key: string, params?: string | number | (string | number)[]) => translateText(languageTable, key, params),
        translateDate: (date: Date | string | number, format: string, utcOrTimeZone: boolean | string = false) => translateDate(languageTable, date, format, utcOrTimeZone),
      }),
    ),


    /**
     * Selector to return a memoized array with log entries occured in the i18n part of the Redux
     * store.
     */
    selectLogs: (state: I18nState) => state.logs,
  },
});


startInitialListener({
  effect: (_, listenerApi) => {
    const { ignoreBrowserLanguage, storageType, code } = listenerApi.getState().i18n;
    const codeFromUrl = parseUrl(window.location.href).queryData['lang'];
    const codeFromBrowser = ignoreBrowserLanguage ? undefined : window.navigator.language;

    if (storageType === StorageType.internal) {
      // If no storage is set in the configuration, take the initial language codes without that one
      // from the storage and set the current language code initially.

      listenerApi.dispatch(slice.actions.addLogEntry({
        level: 'info',
        timestamp: Date.now(),
        title: 'Setting initial language codes',
        text: `1st. "${codeFromUrl ?? '-'}" from the URL and 2nd. "${codeFromBrowser ?? '-'}" from the browser settings. Note that there is no storage set in the configuration.`,
      }));

      void listenerApi.dispatch(setInitialLanguageCode([
        codeFromUrl, // 1st. from the URL
        codeFromBrowser, // 2nd. from the browser settings
      ]));
    } else {
      // Create and initialize a storage connection, take the initial language codes with that one
      // from the storage and set the current language code initially.

      storage = new StorageItf<string>(systemSettings.storage.reservedKeys['languageCode']!, { storageType });

      void storage.init(code).then((codeFromStorage) => {
        listenerApi.dispatch(slice.actions.addLogEntry({
          level: 'info',
          timestamp: Date.now(),
          title: 'Setting initial language codes',
          text: `1st. "${codeFromUrl ?? '-'}" from the URL, 2nd. "${codeFromStorage}" from the storage and 3rd. "${codeFromBrowser ?? '-'}" from the browser settings.`,
        }));

        void listenerApi.dispatch(setInitialLanguageCode([
          codeFromUrl, // 1st. from the URL
          codeFromStorage, // 2nd. from the storage
          codeFromBrowser, // 3rd. from the browser settings
        ]));
      }).catch(() => {
        listenerApi.dispatch(slice.actions.addLogEntry({
          level: 'info',
          timestamp: Date.now(),
          title: 'Setting initial language codes',
          text: `1st. "${codeFromUrl ?? '-'}" from the URL and 2nd. "${codeFromBrowser ?? '-'}" from the browser settings. Note that initializing the storage failed.`,
        }));

        void listenerApi.dispatch(setInitialLanguageCode([
          codeFromUrl, // 1st. from the URL
          codeFromBrowser, // 2nd. from the browser settings
        ]));
      });
    }
  },
});


startListening({
  predicate: ({ type }, currentState, previousState) => (
    !!storage
    && type.startsWith(`${slice.name}/`)
    && (currentState.i18n.code !== previousState.i18n.code)
  ),
  effect: (__, listenerApi2) => {
    storage!.writeValue(listenerApi2.getState().i18n.code);
  },
});


// Listener for adding one or multiple additional languages during the initialization phase. This
// will lead in dispatching an action to (re-)set the current language, listed in the initial
// languages again. So it is ensured, that it can be switched automatically to a stored initial
// language, that is just added later by an action creator. After the initialization phase, this
// listener will be removed.
const unsubscribeAddLanguagesListener = startListening({
  predicate: ({ type }, currentState, previousState) => (
    (type === slice.actions.addLanguage.type)
    || (type === slice.actions.addLanguages.type)
    || (previousState.i18n.isInitialPhase && !currentState.i18n.isInitialPhase)
  ),
  effect: async (_, listenerApi) => {
    if (listenerApi.getState().i18n.isInitialPhase) {
      await listenerApi.dispatch(setInitialLanguageCode());
    } else {
      unsubscribeAddLanguagesListener();
    }
  },
});


export const reducer = enhancedReducerCreator<I18nState>(slice, createInitialState);

export const { name, reducerPath } = slice;

export const {
  addLanguage, addLanguages, removeLanguages, setLanguageCode, addLogEntry,
} = slice.actions;

export const {
  selectIsReady, selectStorageType, selectIsBrowserLanguageIgnored, selectIsInitializing,
  selectInitialLanguageCodes, selectCurrentLanguageCode, selectIsCurrentLanguageRtl,
  selectAllLanguages, selectLanguage, selectDefaultLanguage, selectNumOfLanguageTableEntries,
  selectTools, selectLogs,
} = slice.selectors;
