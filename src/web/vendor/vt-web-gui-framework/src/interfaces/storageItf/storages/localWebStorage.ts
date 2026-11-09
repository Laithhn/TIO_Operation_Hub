/**
 * Exported function to read a value from the Local Web Storage selected by the given value key. If
 * the key does not exist or an error occured, undefined is returned.
 */
export const read = (key: string): unknown => {
  try {
    const value = window.localStorage.getItem(key);
    return (typeof value === 'string') ? JSON.parse(value) : undefined;
  } catch {
    return undefined;
  }
};


/**
 * Exported function to write a given serializable value in the Local Web Storage selected by the
 * given value key. It returns true, if writing was successful.
 */
export const write = (key: string, value: unknown): boolean => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};
