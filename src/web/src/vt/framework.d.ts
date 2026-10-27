// The vendored VtWebGuiFramework 4 is TypeScript, but it is written for TypeScript 6 and its own tsconfig (module
// roots such as "components/…", "store/…"). The hub reaches it through "@vt/…" (see vt-framework.ts) without
// type-checking the vendored tree; the facade src/vt/index.ts and the kit wrap what the hub uses. Every name the hub
// imports from the framework is listed here.
// Framework stylesheets imported by the hub are CSS modules, exactly as inside the framework.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '@vt/*.scss' { const css: Record<string, string>; export = css; }
declare module '@vt/*' {
  const value: any;
  export default value;
  export const color: any, layout: any, space: any, typo: any,
    Button: any, Input: any, SelectBox: any, TabBar: any, TabBarTitleItem: any, Icon: any, Spinner: any, ValueField: any,
    ColumnsSelectionCard: any, DataTable: any, Section: any, Toolbar: any, ToolbarContrItem: any, Card: any,
    getIconPath: any, iconExists: any, viewbox: any, Marker: any,
    i18nSlice: any, storageSlice: any, configureReduxStore: (config: Element) => any;
}
declare module '*.xml?raw' { const s: string; export default s; }
declare module '*.svg?raw' { const s: string; export default s; }
