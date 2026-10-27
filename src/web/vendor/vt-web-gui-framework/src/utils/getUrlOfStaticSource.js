/**
 * Exported function to extend a given path of a static source.
 */
const getUrlOfStaticSource = (path) => {
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

export default getUrlOfStaticSource;
