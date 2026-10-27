import type { ExtendedFormat } from '../dateTimePicker.types';
import formatLib from '../formatLib.json';


/**
 * Function to take a format string apart into its parts - the placeholders of the format library
 * and the text between them - and to say what the format holds: a date (any of year, month, day), a
 * time (any of hours, minutes, seconds), and which hour cycle. A placeholder counts once, a second
 * occurrence is text; the hours count once whichever of their two placeholders comes first. Text in
 * double quotes is always text, and "\\t" - the two characters as well as the tab itself - becomes a
 * spacer part.
 */
export const checkFormatStr = (formatStr: string): ExtendedFormat => {
  const ret: ExtendedFormat = {
    formatStr,
    parts: [],
    allFormatIds: [],
    numFormatIds: 0,
    hasDate: false,
    hasTime: false,
    hasHours: false,
    hasMinutes: false,
    hasSeconds: false,
    hourCycle: 'h23',
  };
  let isComment = false,
    text = '';

  const finalizeText = () => {
    if (text) {
      ret.parts.push({ chars: text, isFormatPart: false });
      text = '';
    }
  };

  for (let i = 0; i < formatStr.length; i++) {
    const char = formatStr.charAt(i);

    if (char === '"') {
      isComment = !isComment;
    } else if (
      !isComment
      && formatLib[char]
      && !ret.allFormatIds.includes(formatLib[char].id)
      && (!formatLib[char].id.startsWith('hour') || ret.allFormatIds.every((id) => !id.startsWith('hour')))
    ) {
      const { id } = formatLib[char];

      finalizeText();
      ret.parts.push({ chars: char, isFormatPart: true });
      ret.allFormatIds.push(id);
    } else if (char === '\t') {
      finalizeText();
      ret.parts.push({ chars: char, isFormatPart: false });
    } else if ((char === '\\') && (formatStr.charAt(i + 1) === 't')) {
      finalizeText();
      ret.parts.push({ chars: '\t', isFormatPart: false });
      i++;
    } else {
      text += char;
    }
  }

  finalizeText();

  ret.numFormatIds = ret.allFormatIds.length;
  ret.hasDate = ret.allFormatIds.some((id) => ['year', 'month', 'day'].includes(id));
  ret.hasHours = ret.allFormatIds.some((id) => id.startsWith('hour'));
  ret.hasMinutes = ret.allFormatIds.includes('minutes');
  ret.hasSeconds = ret.allFormatIds.includes('seconds');
  ret.hasTime = ret.hasHours || ret.hasMinutes || ret.hasSeconds;
  ret.hourCycle = (ret.hasHours && ret.allFormatIds.includes('hoursH12')) ? 'h12' : 'h23';

  return ret;
};
