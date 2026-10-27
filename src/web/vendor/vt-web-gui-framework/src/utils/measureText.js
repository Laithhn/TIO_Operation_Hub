import defines from 'assets/defines';


/**
 * Exported function to derive the width of a given text in pixels.
 *
 * @param {string} text - The text to check.
 * @param {object} [style] - Optionally an object with CSS rules, to manipulate the container, where
 *   the text is placed into.
 * @param {string} [style.fontFamily='"Open Sans", Arial, sans-serif'] - The font family as string.
 * @param {string} [style.fontSize=defines.typo.fontSize.normal] - The font size as string, see
 *   assets/defines.js.
 * @param {number} [style.fontWeight=defines.typo.fontWeight.normal] - The font weight as number,
 *   see assets/defines.js.
 * @param {boolean} [style.italic=false] - Set to true for an italic font.
 * @returns {number}
 */
const measureText = (text, {
  fontFamily = '"Open Sans", "Noto Sans Arabic", Arial, sans-serif',
  fontSize = defines.typo.fontSize.normal,
  fontWeight = defines.typo.fontWeight.normal,
  italic = false,
  considerLineBreaks = false,
} = {
  fontFamily: '"Open Sans", "Noto Sans Arabic", Arial, sans-serif',
  fontSize: defines.typo.fontSize.normal,
  fontWeight: defines.typo.fontWeight.normal,
  italic: false,
  considerLineBreaks: false,
}) => {
  const canvas = (measureText.canvas || (measureText.canvas = document.createElement('canvas')));

  const context = canvas.getContext('2d');
  context.font = `${italic ? 'italic' : 'normal'} ${fontWeight} ${fontSize} ${fontFamily}`;

  const width = (considerLineBreaks)
    ? Math.max(...text.split(/&#10;|\n/).map((part) => context.measureText(part).width))
    : context.measureText(text).width;

  return Math.ceil(width);
};

export default measureText;
