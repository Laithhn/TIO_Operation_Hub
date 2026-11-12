/**
 * Exported function to read a value from the Session Web Storage selected by the given value key.
 * If the key does not exist or an error occured, undefined is returned.
 */
export const read = (key: string): unknown => {
  try {
    const value = window.sessionStorage.getItem(key);
    return (typeof value === 'string') ? JSON.parse(value) : undefined;
  } catch {
    return undefined;
  }
};


/**
 * Exported function to write a given serializable value in the Session Web Storage selected by the
 * given value key. It returns true, if writing was successful.
 */
export const write = (key: string, value: unknown) => {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};
