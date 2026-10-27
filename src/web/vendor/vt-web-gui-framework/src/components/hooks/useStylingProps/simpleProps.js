import Enums from 'assets/enums';


/**
 * Helper function that returns a given style value, if the given value is not the boolean default
 * value. Otherwise null is returned.
*/
const getValueOfBoolean = (prop, value, defaultValue, styleValue) => {
  if (typeof value === 'boolean') {
    return (value !== defaultValue) ? styleValue : null;
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(`useStylingProps: the given value of prop "${prop}" is invalid. It has to be a boolean value, but its value is "${value}".`); // eslint-disable-line no-console
  }

  return null;
};


/**
 * Helper function that returns a given value, if this value is a string and differs from the given
 * default value. Otherwise null is returned.
 */
const getValueOfString = (prop, value, defaultValue) => {
  if (typeof value === 'string') {
    return (value !== defaultValue) ? value : null;
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(`useStylingProps: the given value of prop "${prop}" is invalid. It has to be a string, but its value is "${value}".`); // eslint-disable-line no-console
  }

  return null;
};


/**
 * Helper function that returns a given value, if this value is a string and differs from the given
 * default value. Otherwise null is returned. If isRtl is set to true, the strings "left" and
 * "right" inside the value are swapped.
 */
const getDirectedValueOfString = (prop, value, isRtl, defaultValue) => {
  if (typeof value === 'string') {
    if (value !== defaultValue) {
      return isRtl
        ? value.toLowerCase().replace(/(left|right)/, (match) => `${(match === 'left') ? 'right' : 'left'}`)
        : value;
    }

    return null;
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(`useStylingProps: the given value of prop "${prop}" is invalid. It has to be a string, but its value is "${value}".`); // eslint-disable-line no-console
  }

  return null;
};


/**
 * Helper function that returns the CSS value of a given enum value if it matches the given type and
 * is not marked as default value.
 */
const getValueOfEnum = (prop, value, type) => {
  if (value instanceof type) {
    return (!value.isDefault) ? value.cssValue : null;
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(`useStylingProps: the given value of prop "${prop}" is invalid. It has to be of enum "${type.enumKey}", but its value is "${value}".`); // eslint-disable-line no-console
  }

  return null;
};


const simpleProps = {
  relativePosition: [true, (prop, value) => getValueOfBoolean(prop, value, false, 'relative'), 'position'],
  direction: [true, (prop, value) => getValueOfEnum(prop, value, Enums.ReadingDirection)],
  gridArea: [false, (prop, value) => getValueOfString(prop, value, 'auto')],
  placeSelf: [false, (prop, value) => getValueOfEnum(prop, value, Enums.PlaceSelfItems)],
  alignSelf: [false, (prop, value) => getValueOfEnum(prop, value, Enums.PlaceSelfItems)],
  justifySelf: [false, (prop, value) => getValueOfEnum(prop, value, Enums.PlaceSelfItems)],
  visible: [false, (prop, value) => getValueOfBoolean(prop, value, true, 'hidden'), 'visibility'],
  gridTemplateRows: [true, (prop, value) => getValueOfString(prop, value, 'none')],
  gridTemplateColumns: [true, (prop, value) => getValueOfString(prop, value, 'none')],
  gridTemplateAreas: [true, (prop, value) => getValueOfString(prop, value, 'none')],
  gridAutoFlow: [true, (prop, value) => getValueOfEnum(prop, value, Enums.GridAutoFlow)],
  gridAutoRows: [true, (prop, value) => getValueOfString(prop, value, 'auto')],
  gridAutoColumns: [true, (prop, value) => getValueOfString(prop, value, 'auto')],
  gap: [true, (prop, value) => getValueOfEnum(prop, value, Enums.GapAndPadding)],
  rowGap: [true, (prop, value) => getValueOfEnum(prop, value, Enums.GapAndPadding)],
  columnGap: [true, (prop, value) => getValueOfEnum(prop, value, Enums.GapAndPadding)],
  placeContent: [true, (prop, value) => getValueOfEnum(prop, value, Enums.PlaceContent)],
  alignContent: [true, (prop, value) => getValueOfEnum(prop, value, Enums.PlaceContent)],
  justifyContent: [true, (prop, value) => getValueOfEnum(prop, value, Enums.PlaceContent)],
  placeItems: [true, (prop, value) => getValueOfEnum(prop, value, Enums.PlaceSelfItems)],
  alignItems: [true, (prop, value) => getValueOfEnum(prop, value, Enums.PlaceSelfItems)],
  justifyItems: [true, (prop, value) => getValueOfEnum(prop, value, Enums.PlaceSelfItems)],
  boxShadow: [false, (prop, value) => getValueOfEnum(prop, value, Enums.BoxShadow)],
  objectFit: [true, (prop, value) => getValueOfEnum(prop, value, Enums.ObjectFit)],
  objectPosition: [true, (prop, value, isRtl) => getDirectedValueOfString(prop, value, isRtl, '')],
  textAlign: [true, (prop, value) => getValueOfEnum(prop, value, Enums.TextAlign)],
  overflowHidden: [true, (prop, value) => getValueOfBoolean(prop, value, false, 'hidden'), 'overflow'],
};


/**
 * Exported function that returns true, if a given prop is a simple prop.
 *
 * @param {string} prop - The name of the prop.
 * @returns {boolean}
 */
export const isSimpleProp = (prop) => !!simpleProps[prop];


/**
 * Exported function to derive the style of a given simple prop and append it to the given style
 * object.
 *
 * @param {string} prop - The name of the prop.
 * @param {*} value - The value of the prop.
 * @param {boolean} isRtl - True if the current reading direction is right to left.
 * @param {{ inner: object, outer: object }} style - Object, where the resulting style is appended.
 */
export const deriveSimpleProp = (prop, value, isRtl, style) => {
  const [isForInnerElem, deriveStyleValueFunc, altStyleKey] = simpleProps[prop];
  const styleValue = deriveStyleValueFunc(prop, value, isRtl);

  if (styleValue !== null) {
    style[isForInnerElem ? 'inner' : 'outer'][altStyleKey || prop] = styleValue;
  }
};
