/** Vite's raw imports, used by tests that read source files. */
declare module '*?raw' {
  const text: string;
  export default text;
}
