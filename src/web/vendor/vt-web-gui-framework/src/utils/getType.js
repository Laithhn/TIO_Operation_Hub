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
 * Deprecated: moved to /utils/type
 *
 * @param {*} value
 * @returns {string}
 */
const getType = (value) => Object.prototype.toString.call(value).slice(8, -1).toLowerCase();

export default getType;
