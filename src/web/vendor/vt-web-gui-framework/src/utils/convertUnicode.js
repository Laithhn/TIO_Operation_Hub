/**
 * Exported function to convert decimal or hexadecimal Unciode strings like "&#160;" or "&#x00A0;"
 * inside a given string into real signs.
 *
 * @param {string} str - The string to convert.
 * @returns {string}
 */
const convertUnicode = (str) => (
  (typeof str === 'string')
    ? str.replace(
      /&#(x?)([0-9a-f]+);/ig,
      (match, $1, $2) => String.fromCharCode(
        parseInt($2, ((($1 === 'x') || ($1 === 'X')) ? 16 : 10)),
      ),
    )
    : ''
);

export default convertUnicode;
