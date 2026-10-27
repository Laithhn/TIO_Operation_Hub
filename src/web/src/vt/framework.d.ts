// The vendored VtWebGuiFramework is plain JavaScript (PropTypes, no type declarations).
// Its modules are reached through the "@vt/..." specifier (see vt-framework.ts); the typed facade is src/vt/index.ts.
// Framework stylesheets imported by the hub are CSS modules, exactly as inside the framework.
declare module '@vt/*.scss' { const css: Record<string, string>; export default css; }
declare module '@vt/*' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value: any;
  export default value;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const IconSize: any, ButtonType: any, ButtonState: any, ButtonHighlight: any, InputType: any, InputState: any, CheckBoxType: any, CheckBoxState: any,
    SelectBoxState: any, SpinnerType: any, StatusMarkerSize: any, ValueFieldState: any, TabBarTitleItem: any, TabBarContrItem: any,
    ToolbarContrItem: any, MainToolbarContrItem: any, TabularDescItem: any, TabularValueItem: any, TabularContrItem: any, DateTimePickerType: any,
    viewbox: any, allIconNames: any, iconExists: any, getIconPath: any;
}
declare module '*.xml?raw' { const s: string; export default s; }
declare module '*.svg?raw' { const s: string; export default s; }
