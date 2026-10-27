/**
 * Exported function to deeply compare two values.
 *
 * @param a - The first value.
 * @param b - The second value.
 * @returns {boolean} True, if the values are equal or false if not.
 */
const deepEqual = (a, b) => {
  let keysA, keysB;

  if (a === b) {
    return true;
  }

  // if one of the values is null or undefined, but the other is not (see previous comparison) then
  // return false
  if (a === null || a === undefined || b === null || b === undefined) {
    return false;
  }

  // special comparison, because NaN === NaN returns false
  if ((typeof a === 'number') && Number.isNaN(a) && (typeof b === 'number') && Number.isNaN(b)) {
    return true;
  }

  // special comparison for Date objects
  if ((a instanceof Date) && (b instanceof Date)) {
    return (a.getTime() === b.getTime());
  }

  // compare if neither a nor b is an object
  if ((typeof a !== 'object') && (typeof b !== 'object')) {
    return a === b;
  }

  // both are objects: compare the prototype property
  if (a.prototype !== b.prototype) {
    return false;
  }

  // if both objects are arguments, convert them into an array to compare
  if (Object.prototype.toString.call(a) === '[object Arguments]') {
    if (Object.prototype.toString.call(b) !== '[object Arguments]') {
      return false;
    }

    return deepEqual(Array.prototype.slice.call(a), Array.prototype.slice.call(b));
  }

  // try to get the keys of the objects using try/catch
  try {
    keysA = Object.keys(a);
    keysB = Object.keys(b);
  } catch (e) {
    return false;
  }

  // compare the length of the keys
  if (keysA.length !== keysB.length) {
    return false;
  }

  // sort the keys
  keysA.sort();
  keysB.sort();

  // test the keys
  if (keysA.some((key, i) => key !== keysB[i])) {
    return false;
  }

  // test the values
  if (keysA.some((key) => !deepEqual(a[key], b[key]))) {
    return false;
  }

  return typeof a === typeof b;
};

export default deepEqual;
