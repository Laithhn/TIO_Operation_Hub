// Stand-in for the framework's Redux store ("store" module root), resolved only for the vendored framework files.
// The hub keeps its own router and data layer, so only the parts the vendored components read are provided:
// i18n tools (English, left-to-right, the framework's own language tables and helpers), the viewport width,
// and the main-scope / menu hooks that are no-ops outside the framework frame.
import { translateDate, translateText } from '../../../vendor/vt-web-gui-framework/src/store/i18n/helpers';
import dateTimeXml from '../../../vendor/vt-web-gui-framework/i18n/dateTime.en.xml?raw';
import commonXml from '../../../vendor/vt-web-gui-framework/i18n/common.en.xml?raw';

const table = {};
for (const xml of [dateTimeXml, commonXml]) {
  new DOMParser().parseFromString(xml, 'application/xml').querySelectorAll('Entry')
    .forEach((e) => { table[e.getAttribute('id')] = e.textContent; });
}

const tools = {
  languageCode: 'en',
  isRtl: false,
  translateText: (key, params) => translateText(table, key, params),
  translateDate: (date, format, utcOrTimeZone) => translateDate(table, date, format, utcOrTimeZone),
};

export const state = {
  get viewportWidth() { return window.innerWidth; },
};

export const selectors = {
  i18n: { isCurrentLanguageRtl: () => false, getTools: () => tools },
  app: { getViewportWidth: () => state.viewportWidth },
  menus: { primaryMenu: { getMenuNodeById: () => null } },
};

const noop = () => ({ type: 'vt/noop' });
export const actions = {
  mainScope: { setDefaultMainToolbar: noop, setNoMainToolbar: noop },
};

export const hooks = {
  useI18n: () => tools,
};

export const getStore = () => ({ getState: () => state, dispatch: () => {}, subscribe: () => () => {} });
