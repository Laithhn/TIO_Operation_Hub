import Tag from './tag';


/**
 * Exported function to parse a given text for BBCode tags and replace these tags with HTML
 * elements. The returned result is a React component.
 */
const bbCode = (input) => {
  if ((typeof input !== 'string') || (input === '')) {
    return input;
  }

  const root = new Tag();
  const tokens = Tag.splitToTokens(input);
  let current = root,
    token = null;

  while (tokens.length) {
    token = tokens.shift();

    if (token) {
      const { tagName, isClosingTag } = Tag.parseToken(token);

      if (tagName) {
        if (isClosingTag) {
          if (current.getTagName() === tagName) {
            current = current.getParent();
          }
        } else {
          const tag = new Tag({
            tagName,
            text: token,
            parent: current,
          });

          current.addChild(tag);

          if (current.getTagName() !== tagName) {
            current = tag;
          }
        }
      } else {
        const tag = new Tag({
          text: token,
          parent: current,
        });

        current.addChild(tag);
      }
    }
  }

  return root.toReact();
};

export default bbCode;
