import { parseStorageType } from 'interfaces/storageItf';
import { pushLogEntry } from 'store/pushLogEntry';
import { getAttributeInLowerCase, isAttributeTrue } from 'utils/element';

import type { I18nLanguage, I18nState } from '../i18n.types';
import languagePresets from '../languagePresets.json';

import { buildLanguageTablePath } from './buildLanguageTablePath';
import { findDefaultLanguageCode } from './findDefaultLanguageCode';
import { parseLanguageCode } from './parseLanguageCode';


/**
 * Function to set data of the given XML configuration to the partial Redux state of the slice by
 * mutating the given draft state.
 *
 * @param draftState - A mutable copy of the partial state of the slice.
 * @param config - The XML element of the configuration, conforming to schema file config.xsd. Some
 *   entries of this configuration are set to the partial state.
 */
export const createInitialState = (draftState: I18nState, config: Element) => {
  // -----------------------------------------------------------------------------------------------
  // Read configuration node "Configuration > I18n".
  // -----------------------------------------------------------------------------------------------

  const xmlI18n = config.querySelector(':scope > I18n');

  if (!xmlI18n) {
    throw new Error('VIWGF/store/i18n: the XML data of the configuration has no node <I18n> for the internationalization.');
  }

  draftState.ignoreBrowserLanguage = isAttributeTrue(xmlI18n, 'ignoreBrowserLanguage');
  draftState.storageType = parseStorageType(getAttributeInLowerCase(xmlI18n, 'storageType'));

  draftState.languages.byCode = Array.from(xmlI18n.querySelectorAll('Language')).reduce<I18nState['languages']['byCode']>((acc, xmlLanguage) => {
    if (!xmlLanguage.textContent) {
      pushLogEntry(draftState.logs, {
        slice: 'i18n',
        level: 'error',
        timestamp: Date.now(),
        text: 'A language in <I18n> in the configuration has an empty language code.',
      });
      return acc;
    }

    const lco = parseLanguageCode(xmlLanguage.textContent);
    let isRtl: boolean,
      format: I18nLanguage['format'];

    if (!lco) {
      pushLogEntry(draftState.logs, {
        slice: 'i18n',
        level: 'error',
        timestamp: Date.now(),
        text: `A language in <I18n> in the configuration has an invalid language code: "${xmlLanguage.textContent}".`,
      });
      return acc;
    }

    switch (getAttributeInLowerCase(xmlLanguage, 'isRtl')) {
      case 'true': isRtl = true; break;
      case 'false': isRtl = false; break;
      default: isRtl = (
        languagePresets[lco.code]?.isRtl
        ?? languagePresets[lco.isoCode]?.isRtl
        ?? false);
        break;
    }

    switch (getAttributeInLowerCase(xmlLanguage, 'format')) {
      case 'xml':
        format = 'xml';
        break;

      case 'json':
      default:
        format = 'json';
        break;
    }

    return {
      ...acc,
      [lco.code]: {
        ...lco,
        caption: (
          xmlLanguage.getAttribute('caption')
          || languagePresets[lco.code]?.caption
          || languagePresets[lco.isoCode]?.caption
          || lco.code
        ).trim(),
        isRtl,
        format,
        path: buildLanguageTablePath(lco.code, format),
        isDefault: isAttributeTrue(xmlLanguage, 'isDefault'),
        isAdditional: false,
      },
    };
  }, {});

  draftState.languages.allCodes = Object.keys(draftState.languages.byCode);

  if (draftState.languages.allCodes.length === 0) {
    throw new Error('VIWGF/store/i18n: there are no valid languages found as XML entries <Language> in the configuration at node <I18n>. There must be at least one valid language defined.');
  }

  draftState.defaultCode = findDefaultLanguageCode(draftState);
};
