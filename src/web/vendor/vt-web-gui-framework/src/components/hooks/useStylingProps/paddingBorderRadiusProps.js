import defines from 'assets/defines';
import Enums from 'assets/enums';


const positions = ['Top', 'Right', 'Bottom', 'Left'];
const corners = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'];


/**
 * Exported function that returns true, if a given prop is one of these handled props: "padding",
 * "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "markerTop", "markerRight",
 * "markerBottom", "markerLeft", "borderRadius", "borderTopLeftRadius", "borderTopRightRadius",
 * "borderBottomRightRadius" and "borderBottomLeftRadius".
 *
 * @param {string} prop - The name of the prop.
 * @returns {boolean}
 */
export const isPaddingBorderRadiusProp = (prop) => (
  prop.startsWith('padding') || prop.startsWith('marker') || prop.startsWith('border')
);


/**
 * Exported function to derive the styles of props "padding", "paddingTop", "paddingRight",
 * "paddingBottom", "paddingLeft", "markerTop", "markerRight", "markerBottom", "markerLeft",
 * "borderRadius", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius" and
 * "borderBottomLeftRadius" to derive the style properties "padding", "border" and "borderRadius"
 * and append it to the given style object.
 *
 * @param {object} props - The object of all props with values.
 * @param {boolean} isRtl - True if the current reading direction is right to left.
 * @param {{ inner: object, outer: object }} style - Object, where the resulting styles are appended.
 */
export const derivePaddingBorderRadiusProps = (props, isRtl, style) => {
  const dirPositions = isRtl ? ['Top', 'Left', 'Bottom', 'Right'] : positions;
  let isPadding = false,
    isBorderRadius = false,
    padding;

  // -----------------------------------------------------------------------------------------------
  // Derive the borders from props "markerTop", "markerRight", "markerBottom" and "markerLeft".
  // -----------------------------------------------------------------------------------------------

  const marker = positions.map((pos, idx) => {
    const value = props[`marker${pos}`];

    if (value instanceof Enums.MarkerColor) {
      if (!value.isDefault) {
        const dirPos = dirPositions[idx];
        style.outer[`border${dirPos}`] = `${defines.layout.components.markerWidth}px solid ${value.color}`;
        return true;
      }
    } else if ((process.env.NODE_ENV === 'development') && (value !== undefined)) {
      console.error(`useStylingProps: the given value of prop "marker${pos}" is invalid. It has to be of enum "MarkerColor", but its value is "${value}".`); // eslint-disable-line no-console
    }

    return false;
  });

  // -----------------------------------------------------------------------------------------------
  // Derive the padding from props "padding", "paddingTop", "paddingRight", "paddingBottom",
  // "paddingLeft" and from the marker flags.
  // -----------------------------------------------------------------------------------------------

  if ((process.env.NODE_ENV === 'development') && !(props.padding instanceof Enums.GapAndPadding) && (props.padding !== undefined)) {
    console.error(`useStylingProps: the given value of prop "padding" is invalid. It has to be of enum "GapAndPadding", but its value is "${props.padding}".`); // eslint-disable-line no-console
  }

  padding = new Array(4).fill(
    (props.padding instanceof Enums.GapAndPadding) ? props.padding.value : Enums.GapAndPadding.NONE.value,
  ).map((value, idx) => {
    const singleValue = props[`padding${positions[idx]}`];

    if ((process.env.NODE_ENV === 'development') && !(singleValue instanceof Enums.GapAndPadding) && (singleValue !== undefined)) {
      console.error(`useStylingProps: the given value of prop "padding${positions[idx]}" is invalid. It has to be of enum "GapAndPadding", but its value is "${singleValue}".`); // eslint-disable-line no-console
    }

    let numericValue = ((singleValue instanceof Enums.GapAndPadding) && !singleValue.isDefault)
      ? singleValue.value
      : value;

    if (marker[idx]) {
      numericValue = Math.max(0, numericValue - defines.layout.components.markerWidth);
    }

    isPadding = (isPadding || !!numericValue);

    // return numericValue ? `${numericValue}px` : 0;
    return numericValue;
  });

  if (isPadding) {
    if (isRtl) {
      padding = [padding[0], padding[3], padding[2], padding[1]];
    }

    style.inner.padding = padding.map((value) => `${value}px`).join(' ');
  }

  // -----------------------------------------------------------------------------------------------
  // Derive the border radius from props "borderRadius", "borderTopLeftRadius",
  // "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius" and from the marker
  // flags.
  // -----------------------------------------------------------------------------------------------

  if ((process.env.NODE_ENV === 'development') && (typeof props.borderRadius !== 'boolean') && (props.borderRadius !== undefined)) {
    console.error(`useStylingProps: the given value of prop "borderRadius" is invalid. It has to be a boolean value, but its value is "${props.borderRadius}".`); // eslint-disable-line no-console
  }

  const borderRadius = new Array(4).fill(props.borderRadius === true).map((value, idx) => {
    const singleValue = props[`border${corners[idx]}Radius`];

    if ((process.env.NODE_ENV === 'development') && (typeof singleValue !== 'boolean') && (singleValue !== undefined)) {
      console.error(`useStylingProps: the given value of prop "border${corners[idx]}Radius" is invalid. It has to be a boolean value, but its value is "${singleValue}".`); // eslint-disable-line no-console
    }

    if (value || (props[`border${corners[idx]}Radius`] === true)) {
      isBorderRadius = true;

      if (marker[idx] || marker[(idx + 3) % 4]) {
        return `${defines.layout.components.borderRadiusMax}px`;
      }

      return `${defines.layout.components.borderRadius}px`;
    }

    return 0;
  });

  if (isBorderRadius) {
    style.outer.borderRadius = (isRtl ? [borderRadius[1], borderRadius[0], borderRadius[3], borderRadius[2]] : borderRadius).join(' ');
  }

  return {
    top: padding[0],
    right: padding[1],
    bottom: padding[2],
    left: padding[3],
  };
};
