import type { AnyObject } from './deepEqual.types';


/**
 * Exported function to deeply compare two given values.
 *
 * @returns True, if the values are equal or false if not.
 */
export const deepEqual = (a: unknown, b: unknown): boolean => {
  let keysA: string[], keysB: string[];

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

  // if neither a nor b is a common object, they can't be equal (see 1st comparison)
  if ((typeof a !== 'object') && (typeof b !== 'object')) {
    return false;
  }

  // both are objects: compare the prototype property
  if ((a as AnyObject).prototype !== (b as AnyObject).prototype) {
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
  } catch {
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
  if (keysA.some((key) => !deepEqual((a as AnyObject)[key], (b as AnyObject)[key]))) {
    return false;
  }

  return typeof a === typeof b;
};
