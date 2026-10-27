import { typo } from 'assets/styles';

import type { MeasureText, MeasureTextOptions } from './measureText.types';


/**
 * Exported function to derive and return the width of a given text in pixels.
 */
export const measureText: MeasureText = (text: string, {
  fontFamily = '"Open Sans", "Noto Sans Arabic", Arial, sans-serif',
  fontSize = typo.fontSize.normal,
  fontWeight = typo.fontWeight.normal,
  italic = false,
  considerLineBreaks = false,
}: MeasureTextOptions = {
  fontFamily: '"Open Sans", "Noto Sans Arabic", Arial, sans-serif',
  fontSize: typo.fontSize.normal,
  fontWeight: typo.fontWeight.normal,
  italic: false,
  considerLineBreaks: false,
}): number => {
  measureText.canvas ??= document.createElement('canvas');

  const context = measureText.canvas.getContext('2d');

  if (!context) {
    return 0;
  }

  context.font = `${italic ? 'italic' : 'normal'} ${fontWeight} ${fontSize} ${fontFamily}`;

  const width = (considerLineBreaks)
    ? Math.max(...text.split(/&#10;|\n/).map((part) => context.measureText(part).width))
    : context.measureText(text).width;

  return Math.ceil(width);
};
