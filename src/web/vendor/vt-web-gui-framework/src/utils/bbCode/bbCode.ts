import { Tag } from './Tag';


/**
 * Exported function to parse a given text for BBCode tags and replace these tags with HTML
 * elements. The returned result is a React component.
 *
 * Supported simple BBCodes are: "b", "i", "u", "s", "mark", "sup", "sub" and "code". Supported
 * BBCodes with parameters are "color" and "link". Supported self-closing BBCodes: "br". Available
 * colors are "normal", "weak", "extraWeek", "attention", "attentionHigh", "calmingGreen" and
 * "signalError"; each takes the form for the ground the text sits on.
 *
 * @example
 * const str1 = 'This is a [b]bold text[/b], using [mark]simple[/mark] BBCodes.';
 * const str2 = 'This [color=attention]text[/color] has a color.';
 * const str3 = 'This is a link to [link=https://www.vitronic.com]Vitronic[/link].';
 * const str4 = 'This is also a link to [link]https://www.vitronic.com[/link].';
 * const str5 = 'This is a text[br/]with a line break.';
 */
export const bbCode = (input: string) => {
  if ((typeof input !== 'string') || (input === '')) {
    return input;
  }

  const root = new Tag();
  const tokens = Tag.splitToTokens(input);
  let current = root;

  while (tokens.length) {
    const token = tokens.shift();

    if (token) {
      const { tagName, isClosingTag, isSelfClosingTag } = Tag.parseToken(token);

      if (tagName) {
        if (isSelfClosingTag) {
          current.addChild(new Tag({ tagName, tagStr: token, parent: current }));
        } else if (isClosingTag) {
          const parent = current.getParent();

          if ((current.getTagName() === tagName) && parent) {
            current = parent;
          }
        } else {
          const tag = new Tag({ tagName, tagStr: token, parent: current });
          current.addChild(tag);

          if (current.getTagName() !== tagName) {
            current = tag;
          }
        }
      } else {
        current.addChild(new Tag({ tagStr: token, parent: current }));
      }
    }
  }

  return root.toReact();
};
