import type { CheckNumberOptions } from './type.types';


/**
 * Exported function that returns true, if a given value is a non empty string, or false if not.
 */
export const isNonEmptyString = (value: unknown): value is string => ((typeof value === 'string') && (value !== ''));


/**
 * Exported function that returns true, if a given value is a number, or false if not. Deeper
 * conditions can be defined by an optional object.
 */
export const isNumber = (
  value: unknown,
  {
    withoutInfinite, withoutNaN, gt, gte, lt, lte,
  }: CheckNumberOptions = {},
): value is number => (
  (typeof value === 'number')
  && (!withoutInfinite || Number.isFinite(value))
  && (!withoutNaN || !Number.isNaN(value))
  && ((gt === undefined) || (value > gt))
  && ((gte === undefined) || (value >= gte))
  && ((lt === undefined) || (value < lt))
  && ((lte === undefined) || (value <= lte))
);


/**
 * Exported function that returns true, if a given value is either a non empty string or a number,
 * or false if not. Deeper conditions can be defined by an optional object.
 */
export const isNonEmptyStringOrNumber = (value: unknown, options?: CheckNumberOptions): value is string | number => (
  isNonEmptyString(value)
  || isNumber(value, options)
);


/**
 * Exported function to return the type of the given value as string more detailed than with typeof.
 * But note that typeof and also Array.isArray() are faster than this function!
 * Possible return values: "array", "arraybuffer", "blob", "boolean", "dataview", "date", "error",
 * "float32array", "float64array", "function", "global" (e.g. window), "htmldocument"
 * (e.g. document), "int16array", "int32array", "int8array", "json", "location"
 * (e.g. document.location), "math", "null", "number" (includes NaN and Infinity), "object",
 * "regexp", "string", "symbol", "uint16array", "uint32array", "uint8array", "uint8clampedarray",
 * "undefined", "xmldocument".
 */
export const getType = (value: unknown): string => Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
