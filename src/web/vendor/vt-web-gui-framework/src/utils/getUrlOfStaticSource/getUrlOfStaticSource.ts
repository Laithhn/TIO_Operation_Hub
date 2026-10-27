/**
 * Exported function to extend and return a given path of a static source.
 */
export const getUrlOfStaticSource = (path: string): string => {
  if (!path.startsWith('/')) {
    return path;
  }

  const { origin } = window.location;

  // at the use of Electron
  if (origin.startsWith('file')) {
    return `.${path}`;
  }

  return `${origin}${path}`;
};
