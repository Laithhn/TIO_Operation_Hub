/**
 * This spaces are calculated from typography for the normal font size (16px), which is the default
 * font size in articles: paragraph space = font size * line height * 1.39 = 16 * 1.46 * 1.39 = 32.
 * The others follow the Fibonacci sequence.
 *
 * Changes from v2 to v3: SPACE1 is removed, all other spaces are renamed!
 *
 * @property {number} xxxs - 5 pixels, counterpart in v2: SPACE2.
 * @property {number} xxs - 7 pixels, counterpart in v2: SPACE3.
 * @property {number} xs - 12 pixels, counterpart in v2: SPACE4.
 * @property {number} small - 20 pixels, counterpart in v2: SPACE5.
 * @property {number} medium - 32 pixels, counterpart in v2: SPACE6.
 * @property {number} large - 50 pixels, counterpart in v2: SPACE7.
 * @property {number} xl - 80 pixels, counterpart in v2: SPACE8.
 * @property {number} xxl - 120 pixels, counterpart in v2: SPACE9.
 */
const space = {
  xxxs: 5,
  xxs: 7,
  xs: 12,
  small: 20,
  medium: 32,
  large: 50,
  xl: 80,
  xxl: 120,
};


/**
 * The colors have changed completely from version 2 to 3 due to the new VITRONIC color scheme:
 * - PRIMARY is renamed in primary.
 * - ACCENT1, ACCENT2, ACCENT3, ACCENT4, ACCENT5, ACCENT6 are removed, use one of this instead for
 *   highlighting: attention or attentionHigh.
 * - All signal colors (RED, PINK, PURPLE, DEEPPURPLE, INDIGO, BLUE, LIGHTBLUE, CYAN, TEAL, GREEN,
 *   LIGHTGREEN, LIME, AMBER, ORANGE, DEEPORANGE and BROWN) are removed, use one of this instead to
 *   signal a status: calmingGreen (for OK), attentionHigh (for warning) or signalError.
 * - All gray scale colors (WHITE, GRAY0, GRAY1, GRAY2, GRAY3, GRAY4, GRAY4 and BLACK) are removed,
 *   use one of this instead: offWhite, paleGray, lightGray, gray, darkGray or structureSilver.
 * - All gradient colors (GRAY1, ACCENT1, ACCENT4, RED, PINK, PURPLE, DEEPPURPLE, TEAL, GREEN,
 *   LIGHTGREEN, LIME, YELLOW and BROWN) and all transparent colors (WHITE, BLACK and ACCENT1) are
 *   removed without replacement!
 *
 * @property {string} primary - #001e46, RGB: 0, 30, 70.
 *   Use a light font, if this color is used as background.
 * @property {string} primaryMidnight - #00122b, only for dark backgrounds (e.g. lightbox) with a
 *   light font.
 * @property {string} attention - #00b3ff.
 * @property {string} attentionHigh - #e6932b.
 * @property {string} calmingGreen - #5dae95
 *   Use a light font, if this color is used as background and a dark font, if used as signal color
 *   for status "OK".
 * @property {string} impulseGreen - #2ff3e0.
 * @property {string} signalError - #b00020
 *   Use a light font, if this color is used as background.
 * @property {string} offWhite - #fafbfc. RGB: 250, 251, 252.
 * @property {string} paleGray - #f4f6f7, a transparent version of structureSilver with 3%
 *   transparency.
 * @property {string} lightGray - #e8ebed, a transparent version of structureSilver with 9%
 *   transparency.
 * @property {string} gray - #a4abb0, a transparent version of structureSilver with 44%
 *   transparency.
 * @property {string} darkGray - #647078, a transparent version of structureSilver with 77%
 *   transparency. Use a light font, if this color is used as background.
 * @property {string} structureSilver - #374650, RGB: 55, 70, 80, the base of all shades of gray.
 *   Use a light font, if this color is used as background.
 */
const color = {
  primary: '#001e46',
  primaryMidnight: '#00122b',
  attention: '#00b3ff',
  attentionHigh: '#e6932b',
  calmingGreen: '#5dae95',
  impulseGreen: '#2ff3e0',
  signalError: '#b00020',
  offWhite: '#fafbfc',
  paleGray: '#f4f6f7',
  lightGray: '#e8ebed',
  gray: '#a4abb0',
  darkGray: '#647078',
  structureSilver: '#374650',
};


/**
 * Typographical settings: font size, font weight, line height and color. Note that only those font
 * weights are enabled that are supported by the font used.
 *
 * Changes from v2 to v3:
 * - The keys of the font sizes, font weights and line heights are now written in lowercase.
 * - The font weight "light" is disabled and "bold" is enabled.
 * - All dark and light colors (STRONG, NORMAL, WEAK, EXTRAWEAK, PRIMARY, ACCENT1, ACCENT4, RED,
 *   GREEN and LINK) are removed, use one of this instead: normal, weak, extraWeak, attention,
 *   attentionHigh, calmingGreen or signalError.
 *
 * @property {object} fontSize
 * @property {string} fontSize.xs - 0.75rem.
 * @property {string} fontSize.small - 0.85rem, value in v2: 0.875rem.
 * @property {string} fontSize.normal - 1rem.
 * @property {string} fontSize.semilarge - 1.15rem.
 * @property {string} fontSize.large - 1.4rem, value in v2: 1.5rem.
 * @property {string} fontSize.xl - 1.9rem, value in v2: 2.25rem.
 * @property {string} fontSize.xxl - 3.1rem, value in v2: 3.625rem.
 * @property {object} fontWeight
 * @property {number} fontWeight.normal - 400, available for Open Sans, Noto Sans Arabic and Source
 *   Code Pro.
 * @property {number} fontWeight.semibold - 600, available for Open Sans, Noto Sans Arabic and
 *   Source Code Pro.
 * @property {number} fontWeight.bold - 700, available for Open Sans and Noto Sans Arabic.
 * @property {object} lineHeight
 * @property {string} lineHeight.small - 1.3, value in v2: 1.27em.
 * @property {string} lineHeight.normal - 1.5, value in v2: 1.46em.
 * @property {object} color
 * @property {object} color.dark
 * @property {string} color.dark.normal - color.primary.
 * @property {string} color.dark.weak - color.primary, 65% transparency.
 * @property {string} color.dark.extraWeak - color.primary, 30% transparency.
 * @property {string} color.dark.attention - color.attention, 15% darker.
 * @property {string} color.dark.attentionHigh - color.attentionHigh, 10% darker.
 * @property {string} color.dark.calmingGreen - color.calmingGreen.
 * @property {string} color.dark.signalError - color.signalError.
 * @property {object} color.light
 * @property {string} color.light.normal - color.offWhite.
 * @property {string} color.light.weak - color.offWhite, 55% transparency.
 * @property {string} color.light.extraWeak - color.offWhite, 35% transparency.
 * @property {string} color.light.attention - color.attention, 5% lighter.
 * @property {string} color.light.attentionHigh - color.attentionHigh.
 * @property {string} color.light.calmingGreen - color.calmingGreen.
 * @property {string} color.light.signalError - color.signalError, 15% lighter.
 */
const typo = {
  fontSize: {
    xs: '0.75rem',
    small: '0.85rem',
    normal: '1rem',
    semilarge: '1.15rem',
    large: '1.4rem',
    xl: '1.9rem',
    xxl: '3.1rem',
  },
  fontWeight: {
    // thin: 100,
    // extralight: 200,
    // light: 300,
    normal: 400,
    // medium: 500,
    semibold: 600,
    bold: 700,
    // extrabold: 800,
    // black: 900,
  },
  lineHeight: {
    small: '1.3',
    normal: '1.5',
  },
  color: {
    dark: {
      normal: color.primary,
      weak: 'rgba(0, 30, 70, 0.65)',
      extraWeak: 'rgba(0, 30, 70, 0.3)',
      attention: '#007db3',
      attentionHigh: '#c77917',
      calmingGreen: color.calmingGreen,
      signalError: color.signalError,
    },
    light: {
      normal: color.offWhite,
      weak: 'rgba(250, 251, 252, 0.55)',
      extraWeak: 'rgba(250, 251, 252, 0.35)',
      attention: '#1abbff',
      attentionHigh: color.attentionHigh,
      calmingGreen: color.calmingGreen,
      signalError: '#fc002e',
    },
  },
  typoSet: {},
};

// Typographical sets for headlines, titles, labels, hints and values in five sizes (small, normal,
// large, xl and xxl).
typo.typoSet.headline = {
  fontSize: typo.fontSize.xl,
  fontWeight: typo.fontWeight.bold,
  lineHeight: typo.lineHeight.small,
  color: { dark: typo.color.dark.normal, light: typo.color.light.normal },
  disabledColor: { dark: typo.color.dark.extraWeak, light: typo.color.light.extraWeak },
};

typo.typoSet.title = {
  fontSize: typo.fontSize.semilarge,
  fontWeight: typo.fontWeight.bold,
  lineHeight: typo.lineHeight.small,
  color: { dark: typo.color.dark.normal, light: typo.color.light.normal },
  disabledColor: { dark: typo.color.dark.extraWeak, light: typo.color.light.extraWeak },
};

typo.typoSet.label = {
  fontSize: typo.fontSize.small,
  fontWeight: typo.fontWeight.semibold,
  lineHeight: typo.lineHeight.normal,
  color: { dark: typo.color.dark.normal, light: typo.color.light.normal },
  disabledColor: { dark: typo.color.dark.extraWeak, light: typo.color.light.extraWeak },
};

typo.typoSet.hint = {
  fontSize: typo.fontSize.small,
  fontWeight: typo.fontWeight.normal,
  lineHeight: typo.lineHeight.normal,
  color: { dark: typo.color.dark.weak, light: typo.color.light.weak },
  disabledColor: { dark: typo.color.dark.extraWeak, light: typo.color.light.extraWeak },
};

typo.typoSet.value = {
  small: {
    fontSize: typo.fontSize.small,
    fontWeight: typo.fontWeight.normal,
  },
  normal: {
    fontSize: typo.fontSize.normal,
    fontWeight: typo.fontWeight.normal,
  },
  large: {
    fontSize: typo.fontSize.large,
    fontWeight: typo.fontWeight.normal,
  },
  xl: {
    fontSize: typo.fontSize.xl,
    fontWeight: typo.fontWeight.normal,
  },
  xxl: {
    fontSize: typo.fontSize.xxl,
    fontWeight: typo.fontWeight.normal,
  },
  lineHeight: typo.lineHeight.normal,
  color: { dark: typo.color.dark.normal, light: typo.color.light.normal },
  disabledColor: { dark: typo.color.dark.extraWeak, light: typo.color.light.extraWeak },
};


/**
 * Common layout settings.
 */
const layout = {
  defaultAnimationTimeMs: 250,
  fadeInOutTimeMs: 150,
  mostLeftRightPadding: space.xs, // padding on the most left and / or right outer side of the header, sidebar and footer
  scrollBarThickness: space.small,
  resizableSnapDim: 5,
  dimmedBackground: `rgba(${color.structureSilver}, .7)`,
  header: {
    height: 46, // the total height of the header of the framework in pixels
    logoWidth: 120, // the width of the company logo in the header in pixels
    iconSize: 24, // the width and height of the icons of the links in the header in pixels
  },
  sidebars: {
    firstSidebarWidth: 180, // the total width of the first sidebar of the framework in pixels
    secondSidebarDefaultWidth: 320, // the default width of the second sidebar of the framework in pixels
    borderColor: '#ccd2da', // is a transparent version of color primary with 20% transparency
    background: color.offWhite,
  },
  mainToolbar: {
    height: 60, // the total height of the main toolbar of dashboards in pixels
    background: color.offWhite,
  },
  modwins: {
    spaceLeftRight: space.xs,
    spaceTop: space.xs,
    spaceBottom: space.xs,
    minimizedModwinWidth: 250,
    minimizedModwinHeight: space.medium,
  },
  notifications: {
    padding: space.xs, // the space for the notifications below the header, above the footer and from the left and right side of the browser
    animInTimeMs: 400, // total time in milliseconds for showing a notification with animation
    animOutTimeMs: 1200, // total time in milliseconds for hiding a notification with animation
    showTimePerCharMs: 50,
    showTimeMinMs: 2000,
    showTimeMaxMs: 7000,
  },
  article: {
    background: color.offWhite, // also the background color of iframe contents in the main scope and of the error screen
  },
  dashboard: {
    background: color.lightGray,
  },
  components: {
    dividerBorderDark: `1px solid ${color.primary}`, // dark border to devide inner elements (no other sections) of section
    dividerBorderLight: `1px solid ${color.offWhite}`, // light border to devide inner elements (no other sections) of section
    borderRadius: 0, // change from v2 to v3: no border radius anymore
    borderRadiusMax: 0, // change from v2 to v3: no border radius anymore
    markerWidth: space.xxs,
  },
  controls: {
    animationTimeMs: 50,
    heightDefault: 28, // the default height of control elements
    heightLarge: 50, // special large height of control elements
    iconDimDefault: 18, // the default dimension of icons, used inside control elements, must not exceed the value of controls.heightDefault
    iconDimLarge: 32, // the dimension of large icons like in icon buttons, must not exceed the value of controls.heightLarge
    noticeHeight: 18, // the height of additional notice texts, used below or on top of control elements like input fields
    color: {
      dark: {
        disabled: `rgba(${color.structureSilver}, .33)`,
        backgroundInput: `rgba(${color.structureSilver}, .05)`,
        backgroundFocus: `rgba(${color.structureSilver}, .08)`,
        backgroundClick: `rgba(${color.structureSilver}, .18)`,
      },
      light: {
        disabled: `rgba(${color.offWhite}, .33)`,
        backgroundInput: `rgba(${color.offWhite}, .15)`,
        backgroundFocus: `rgba(${color.offWhite}, .18)`,
        backgroundClick: `rgba(${color.offWhite}, .28)`,
      },
    },
  },
  boxShadow: {
    level1: '"0 1px 3px rgba(0, 0, 0, .12), 0 1px 2px rgba(0, 0, 0, .24)"',
    level2: '"0 3px 6px rgba(0, 0, 0, .16), 0 3px 6px rgba(0, 0, 0, .23)"',
    level3: '"0 10px 20px rgba(0, 0, 0, .19), 0 6px 6px rgba(0, 0, 0, .23)"',
    level4: '"0 14px 28px rgba(0, 0, 0, .25), 0 10px 10px rgba(0, 0, 0, .22)"',
    level5: '"0 19px 38px rgba(0, 0, 0, .30), 0 15px 12px rgba(0, 0, 0, .22)"',
  },
};


/**
 * System settings.
 */
const system = {
  timeoutToSetInitialLanguageCodeMs: 30000,
  throttleDelaySetViewportDimsMs: 100,
  contentChangeFadeOutTimeMs: 250,
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
    },
  },
};


/*
 * Exports (must be done with module.exports because of the use of @indigotree/dart-sass-json-importer)
 */

module.exports = {
  space,
  color,
  typo,
  system,
  layout,
};
