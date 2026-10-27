import type { PayloadAction } from '@reduxjs/toolkit';

import type { StorageType } from 'interfaces/storageItf';
import type { LogEntry, RootState } from 'store/store.types';


export interface I18nLanguageCode {
  /** The full language code, e.g.: "de", "en-us", "en-gb-customerXY". */
  code: string;
  /** The first and main part of the full language code, the ISO 639-1 code, e.g. "de" or "en". */
  isoCode: string;
  /** The optional and complete extension behind the ISO 639-1 code if available, or an empty string
   * if not. Can be a country code and / or a special code like "us" or "gb-customerXY". */
  codeExt: string;
}


export type I18nLanguageTable = Record<string, string>;


export interface I18nLanguage extends I18nLanguageCode {
  /** The caption of the language in its own language, e.g. "Deutsch", "English". */
  caption: string;
  /** True, if the direction of the language is right-to-left or false if not. */
  isRtl: boolean;
  /** The format of the file of the language table: "json" or "xml". */
  format: 'json' | 'xml';
  /** The full file path to the language table. */
  path: string;
  /** True, if the language is set as a default language (its possible that multiple languages are
   * set as default). */
  isDefault: boolean;
  /** True, if the language is an additional language, added by an action creator. */
  isAdditional: boolean;
}


export interface I18nState {
  /** Flag that indicates if the language of the browser will be ignored (true) or considered
   * (false) for the initial languages. Default: false. */
  ignoreBrowserLanguage: boolean;
  /** The type of the storage. Default: INTERNAL. */
  storageType: StorageType;
  /** True, if the system is in the initalisation phase, where the initial languages will be used
   * every time to set the current language, when new languages are added or removed. The initial
   * phase ends (set to false) when setting the language code is done the first time by the user.
   * Default: true.*/
  isInitialPhase: boolean;
  /** List of full language codes, set initially in the i18n middleware. Before that, it is null
   * (default). */
  initialCodes: string[] | null;
  /** The full language code that is set as default (default language). A default language always
   * exists after parsing the configuration initially. Default: empty string. */
  defaultCode: string;
  /** The full language code currently set, examples: "de", "en-us" or "en-gb-customerXY". Default:
   * empty string. */
  code: string;
  /** True if setting a language code is requested, checked and prepared to use now. If it will be
   * accepted or refused after that, this flag is set to false again. Default: false. */
  settingCode: boolean;
  /** All existing languages, collected initially from the configuration and optionally later by
   * action creators. From the configuration, there must one language be given at least. */
  languages: {
    /** Object with the data objects of all languages. The key is the full language code. */
    byCode: Record<string, I18nLanguage>;
    /** The full language codes of all existing languages. */
    allCodes: string[];
  };
  tables: {
    /** Object with the loaded translation tables of the languages. The key is the full language
     * code. */
    byCode: Record<string, I18nLanguageTable>;
    /** The full language codes of all loaded translation tables. */
    allCodes: string[];
  };
  /** An array of log entries occured in the i18n reducer. */
  logs: LogEntry[];
}


export interface AddLanguageOptions {
  /** Optionally the caption of the language in its own language. If not given to add a language, it
   * will be determined automatically or the language code is used as caption. */
  caption?: string;
  /** Optionally true, if the direction of the language is right-to-left or false if not. If not
   * given, it is determined automatically or is set to false. */
  rtl?: boolean;
  /** Optionally the format of the file of the language table. If not given to add a language, it is
   * set to "json". */
  format?: I18nLanguage['format'];
  /** Optionally true, if the language is set as the default language. If not given to add a
   * language, it is set to false. */
  isDefault?: boolean;
}


export type AddLanguageAction = PayloadAction<{
  code: string;
  caption: string | undefined;
  rtl: boolean | undefined;
  format: I18nLanguage['format'] | undefined;
  isDefault: boolean | undefined;
}>;


export interface SetLanguageCodePayload {
  code: string;
  table?: I18nLanguageTable;
}


export interface SetLanguageCodeThunkApi {
  rejectValue: {
    error: string;
  };
}


export interface SetInitialLanguageCodePayload {
  initialCodes?: string[];
  code: string;
  table?: I18nLanguageTable;
}


export interface SetInitialLanguageCodeThunkApi {
  state: RootState;
  rejectValue: {
    error: string;
  };
}
