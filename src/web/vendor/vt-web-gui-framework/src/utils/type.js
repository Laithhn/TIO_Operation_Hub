/**
 * Exported function to check, if a given value is a non empty string.
 *
 * @param {*} value
 * @returns boolean
 */
export const isNonEmptyString = (value) => ((typeof value === 'string') && (value !== ''));


/**
 * Exported function to check, if a given value is a number. Deeper conditions can be defined by an
 * optional object.
 *
 * @param {*} value
 * @param {object} [options]
 * @param {boolean} [options.withoutInfinite=false] - Set to true, to also check that the given
 *   value is not +Infinity, -Infinity or NaN.
 * @param {boolean} [options.withoutNaN=false] - Set to true, to also check that the given value is
 *   not NaN
 * @param {number|null} [options.min=null] - Optionally define a minimum number (inclusive) for the
 *   given value.
 * @param {number|null} [options.max=null] - Optionally define a maximum number (inclusive) for the
 *   given value.
 * @param {number|null} [options.gt=null] - Optionally define a minimum number (exclusive) for the
 *   given value (greater than).
 * @param {number|null} [options.lt=null] - Optionally define a maximum number (exclusive) for the
 *   given value (less than).
 * @returns boolean
 */
export const isNumber = (
  value,
  {
    withoutInfinite = false, withoutNaN = false, min = null, max = null, gt = null, lt = null,
  } = {
    withoutInfinite: false, withoutNaN: false, min: null, max: null, gt: null, lt: null,
  },
) => (
  (typeof value === 'number')
  && (!withoutInfinite || Number.isFinite(value))
  && (!withoutNaN || !Number.isNaN(value))
  && ((min === null) || (value >= min))
  && ((max === null) || (value <= max))
  && ((gt === null) || (value > gt))
  && ((lt === null) || (value < lt))
);


/**
 * Exported function to check, if a given value is eiter a non empty string or a number. Deeper
 * conditions can be defined by an optional object.
 *
 * @param {*} value
 * @param {object} [options]
 * @param {boolean} [options.withoutInfinite=false] - Set to true, to also check that a given number
 *   is not +Infinity, -Infinity or NaN.
 * @param {boolean} [options.withoutNaN=false] - Set to true, to also check that a given number is
 *   not NaN
 * @param {number|null} [options.min=null] - Optionally define a minimum number (inclusive) for the
 *   given value (if it is a number).
 * @param {number|null} [options.max=null] - Optionally define a maximum number (inclusive) for the
 *   given value (if it is a number).
 * @returns boolean
 */
export const isNonEmptyStringOrNumber = (value, options) => (
  isNonEmptyString(value)
  || isNumber(value, options)
);


/**
 * Exported function to return the type of the given value as string more detailed than with typeof.
 * But note that typeof and also Array.isArray() are faster than this function!
 * Possible return values: "array", "arraybuffer", "blob", "boolean", "dataview", "date",
 * "float32array", "float64array", "function", "global" (e.g. window), "htmldocument"
 * (e.g. document), "int16array", "int32array", "int8array", "json", "location"
 * (e.g. document.location), "math", "null", "number" (includes NaN and Infinity), "object",
 * "regexp", "string", "symbol", "uint16array", "uint32array", "uint8array", "uint8clampedarray",
 * "undefined", "xmldocument".
 *
 * @param {*} value
 * @returns {string}
 */
export const getType = (value) => Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
