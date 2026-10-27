import Enums from 'assets/enums';


/**
 * Exported function that returns true, if a given prop is one of these handled props: "padding",
 * "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "markerTop", "markerRight",
 * "markerBottom", "markerLeft", "borderRadius", "borderTopLeftRadius", "borderTopRightRadius",
 * "borderBottomRightRadius" and "borderBottomLeftRadius".
 *
 * @param {string} prop - The name of the prop.
 * @returns {boolean}
 */
export const isBackgroundProp = (prop) => prop.startsWith('background');


/**
 * Exported function to derive the style of props "backgroundColor", "backgroundImage" and
 * "backgroundOptions" and append it to the given style object.
 *
 * @param {object} props - The object of all props with values.
 * @param {boolean} isRtl - True if the current reading direction is right to left.
 * @param {{ inner: object, outer: object }} style - Object, where the resulting styles are appended.
 * @returns {boolean} True if the resulting background color is dark and requires a dark theme.
 */
export const deriveBackgroundProps = (props, isRtl, style) => {
  const { backgroundColor, backgroundImage, backgroundOptions } = props;
  const backgroundArr = [];
  let suppressImage = false,
    hasDarkBackground = false;

  if (process.env.NODE_ENV === 'development') {
    if (!(backgroundColor instanceof Enums.BackgroundColor) && (backgroundColor !== undefined)) {
      console.error(`useStylingProps: the given value of prop "backgroundColor" is invalid. It has to be of enum "BackgroundColor", but its value is "${backgroundColor}".`); // eslint-disable-line no-console
    }

    if ((typeof backgroundImage !== 'string') && (backgroundImage !== undefined)) {
      console.error(`useStylingProps: the given value of prop "backgroundImage" is invalid. It has to be a string, but its value is "${backgroundImage}".`); // eslint-disable-line no-console
    }

    if ((typeof backgroundOptions !== 'string') && (backgroundOptions !== undefined)) {
      console.error(`useStylingProps: the given value of prop "backgroundOptions" is invalid. It has to be a string, but its value is "${backgroundOptions}".`); // eslint-disable-line no-console
    }
  }

  // get the background color
  if ((backgroundColor instanceof Enums.BackgroundColor) && !backgroundColor.isDefault) {
    hasDarkBackground = backgroundColor.darkTheme;
    backgroundArr.push(backgroundColor.color);
    suppressImage = backgroundColor.isGradient;
  }

  // get the background image if the color set before is not a color gradient
  if (!suppressImage && (typeof backgroundImage === 'string') && (backgroundImage !== '')) {
    backgroundArr.push(backgroundImage);

    // if there is a background image, add the background options if available
    if ((typeof backgroundOptions === 'string') && (backgroundOptions !== '')) {
      backgroundArr.push(backgroundOptions);
    }
  }

  // build the background string
  if (backgroundArr.length > 0) {
    let background = backgroundArr.join(' ');

    if (isRtl) {
      background = background.replace(/(left|right)/, (match) => `${(match === 'left') ? 'right' : 'left'}`);
    }

    style.outer.background = background;
  }

  return hasDarkBackground;
};
