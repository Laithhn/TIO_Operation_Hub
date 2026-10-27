/**
 * System settings.
 */
export const systemSettings = {
  timeoutToSetInitialLanguageCodeMs: 30000,
  desktopApp: {
    defaultWidth: 1400,
    defaultHeight: 1050,
    defaultMinWidth: 800,
    defaultMinHeight: 600,
  },
  specialMenuNodeIds: {
    selectLanguage: 'VIWGF_SELECT_LANGUAGE',
  },
  storage: {
    reservedKeys: {
      desktopApp: '__dapp__',
      languageCode: '__lc__',
      secondSidebar: '__secsb__',
      webSocketSessionIds: '__wssi__',
    } satisfies Record<string, string> as Record<string, string>,
  },
};
