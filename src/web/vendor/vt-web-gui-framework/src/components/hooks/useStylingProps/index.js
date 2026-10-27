import { useRef } from 'react';
import { useSelector } from 'react-redux';

import { selectors } from 'store';

import { isBackgroundProp, deriveBackgroundProps } from './backgroundProps';
import { isPaddingBorderRadiusProp, derivePaddingBorderRadiusProps } from './paddingBorderRadiusProps';
import { isSimpleProp, deriveSimpleProp } from './simpleProps';


/**
 * @typedef {object} UseStylingPropsInput
 * @property {boolean} [relativePosition=false] - If set to true, it results in "position:
 *   relative;", for inner style.
 * @property {ReadingDirection} [direction=Enums.ReadingDirection.AUTO] - for inner style.
 * @property {string} [gridArea=auto] - for outer style.
 * @property {PlaceSelfItems} [placeSelf=Enums.PlaceSelfItems.AUTO] - for outer style.
 * @property {PlaceSelfItems} [alignSelf=Enums.PlaceSelfItems.AUTO] - for outer style.
 * @property {PlaceSelfItems} [justifySelf=Enums.PlaceSelfItems.AUTO] - for outer style.
 * @property {boolean} [visible=true] - If set to false, it results in "visibility: hidden;", for
 *   outer style.
 * @property {string} [gridTemplateRows=none] - for inner style.
 * @property {string} [gridTemplateColumns=none] - for inner style.
 * @property {string} [gridTemplateAreas=none] - for inner style.
 * @property {GridAutoFlow} [gridAutoFlow=Enums.GridAutoFlow.ROW] - for inner style.
 * @property {string} [gridAutoRows=auto] - for inner style.
 * @property {string} [gridAutoColumns=auto] - for inner style.
 * @property {GapAndPadding} [gap=Enums.GapAndPadding.NONE] - for inner style.
 * @property {GapAndPadding} [rowGap=Enums.GapAndPadding.NONE] - for inner style.
 * @property {GapAndPadding} [columnGap=Enums.GapAndPadding.NONE] - for inner style.
 * @property {PlaceContent} [placeContent=Enums.PlaceContent.AUTO] - for inner style.
 * @property {PlaceContent} [alignContent=Enums.PlaceContent.AUTO] - for inner style.
 * @property {PlaceContent} [justifyContent=Enums.PlaceContent.AUTO] - for inner style.
 * @property {PlaceSelfItems} [placeItems=Enums.PlaceSelfItems.AUTO] - for inner style.
 * @property {PlaceSelfItems} [alignItems=Enums.PlaceSelfItems.AUTO] - for inner style.
 * @property {PlaceSelfItems} [justifyItems=Enums.PlaceSelfItems.AUTO] - for inner style.
 * @property {GapAndPadding} [padding=Enums.GapAndPadding.NONE] - for inner style.
 * @property {GapAndPadding} [paddingTop=Enums.GapAndPadding.NONE] - for inner style.
 * @property {GapAndPadding} [paddingRight=Enums.GapAndPadding.NONE] - for inner style.
 * @property {GapAndPadding} [paddingBottom=Enums.GapAndPadding.NONE] - for inner style.
 * @property {GapAndPadding} [paddingLeft=Enums.GapAndPadding.NONE] - for inner style.
 * @property {MarkerColor} [markerTop=Enums.MarkerColor.NONE] - results in a colored border, for
 *   outer style.
 * @property {MarkerColor} [markerRight=Enums.MarkerColor.NONE] - results in a colored border, for
 *   outer style.
 * @property {MarkerColor} [markerBottom=Enums.MarkerColor.NONE] - results in a colored border, for
 *   outer style.
 * @property {MarkerColor} [markerLeft=Enums.MarkerColor.NONE] - results in a colored border, for
 *   outer style.
 * @property {boolean} [borderRadius=false] - for outer style.
 * @property {boolean} [borderTopLeftRadius=false] - for outer style.
 * @property {boolean} [borderTopRightRadius=false] - for outer style.
 * @property {boolean} [borderBottomRightRadius=false] - for outer style.
 * @property {boolean} [borderBottomLeftRadius=false] - for outer style.
 * @property {BackgroundColor} [backgroundColor=Enums.BackgroundColor.NONE] - for outer style.
 * @property {string} [backgroundImage=] - Can be "url(...)" or gradient colors or the complete
 *   value of CSS property "background", for outer style.
 * @property {string} [backgroundOptions=] - Additionally background options like origin, position,
 *   repeat or size, will be appended to the background value, for outer style.
 * @property {BoxShadow} [boxShadow=Enums.BoxShadow.NONE] - for outer style.
 * @property {ObjectFit} [objectFit=Enums.ObjectFit.FILL] - for inner style.
 * @property {string} [objectPosition=] - for inner style.
 * @property {TextAlign} [textAlign=Enums.TextAlign.AUTO] - for inner style.
 * @property {boolean} [overflowHidden=false] - If set to true, it results in "overflow: hidden;",
 *   for inner style.
 */

/**
 * @typedef {object} UseStylingPropsResult
 * @property {object} innerElemStyle - Object with CSS inline styles for the inner element.
 * @property {object} outerElemStyle - Object with CSS inline styles for the outer element.
 * @property {object} [elemStyle] - Optionally an object with all CSS inline styles (inner and
 *   outer elemend combined).
 * @property {object} padding - Object with the resulting numerical padding values.
 * @property {number} padding.top - The resulting top padding.
 * @property {number} padding.right - The resulting right padding.
 * @property {number} padding.bottom - The resulting bottom padding.
 * @property {number} padding.left - The resulting left padding.
 * @property {boolean} hasDarkBackground - True, if the styling result leads to a dark background.
 */

/**
 * This hook transforms given props into a CSS inline style object. The props that are available for
 * the component are limited by the given array "usedStylingProps" (2nd argument).
 *
 * This hook is optimized for the following assumptions: 1. usually only a small part of the props
 * listed in "usedStylingProps" is finally used (< 20%); 2. during inital rendering, the styles of
 * all given props have to be derived; 3. at all further renderings the props change only rarely (at
 * responsivity changes, highlightings and so on).
 * So this hook re-derives the returned style objects every time, if at least one of the given and
 * valid props changes. If the reading direction of the language changes, everything is re-derived
 * too.
 *
 * @param {UseStylingPropsInput} props - The object with the given props. Ideally, only props that
 *   are processed by this hook should be transferred. This object does not have to be memoized.
 * @param {string[]} usedStylingProps - A list as array with the names of the props that are used by
 *   the component that implements this hook.
 * @param {object} options
 * @param {boolean} [options.addCombinedStyle=false] - Optionally set to true, if a combined style
 *   object named "elemStyle" is returned additionally.
 * @returns {UseStylingPropsResult}
 */
const useStylingProps = (
  props,
  usedStylingProps,
  { addCombinedStyle = false } = { addCombinedStyle: false },
) => {
  const isRtl = useSelector(selectors.i18n.isCurrentLanguageRtl);

  const prevPropsRef = useRef({});
  const prevPropsListRef = useRef([]);
  const prevAddCombinedStyle = useRef();
  const prevIsRtl = useRef();

  const stylesRef = useRef({
    innerElemStyle: {},
    outerElemStyle: {},
    elemStyle: {}, // only available if addCombinedStyle is set to true
    hasDarkBackground: false,
  });

  let isEqual = true;


  // -----------------------------------------------------------------------------------------------
  // In development mode only: check the props listed in the given array "usedProps".
  // -----------------------------------------------------------------------------------------------

  if (process.env.NODE_ENV === 'development') {
    usedStylingProps.forEach((prop) => {
      if (!isSimpleProp(prop) && !isPaddingBorderRadiusProp(prop) && !isBackgroundProp(prop)) {
        console.error(`useStylingProps: prop "${prop}", listed in the given array "usedProps" is not handled in this hook.`); // eslint-disable-line no-console
      }
    });
  }


  // -----------------------------------------------------------------------------------------------
  // At first, build a list with all of the given props, that are inside the usedProps array. Check,
  // if any values have changed.
  // -----------------------------------------------------------------------------------------------

  const propsList = Object.keys(props).filter((prop) => {
    if (usedStylingProps.includes(prop)) {
      isEqual = (isEqual && (props[prop] === prevPropsRef.current[prop]));
      return true;
    }
    return false;
  });


  // -----------------------------------------------------------------------------------------------
  // If at least one prop has changed or a prop is removed (this is checked by comparing the length
  // of the arrays), derive the new complete style.
  // -----------------------------------------------------------------------------------------------

  if (
    !isEqual
    || (propsList.length !== prevPropsListRef.current.length)
    || (addCombinedStyle !== prevAddCombinedStyle.current)
    || (isRtl !== prevIsRtl.current)
  ) {
    const style = { inner: {}, outer: {} };
    let arePaddingBorderRadiusDerived = false,
      isBackgroundDerived = false,
      padding = {
        top: 0, right: 0, bottom: 0, left: 0,
      },
      hasDarkBackground = false;

    propsList.forEach((prop) => {
      const value = props[prop];

      // -------------------------------------------------------------------------------------------
      if (isSimpleProp(prop)) { // 1.) Handle the simple props.
      // -------------------------------------------------------------------------------------------

        deriveSimpleProp(prop, value, isRtl, style);

      // -------------------------------------------------------------------------------------------
      } else if (!arePaddingBorderRadiusDerived && isPaddingBorderRadiusProp(prop)) { // 2.) Handle props for padding, marker and border radius.
      // -------------------------------------------------------------------------------------------

        padding = derivePaddingBorderRadiusProps(props, isRtl, style);
        arePaddingBorderRadiusDerived = true;

      // -------------------------------------------------------------------------------------------
      } else if (!isBackgroundDerived && isBackgroundProp(prop)) { // 3.) Handle props for background.
      // -------------------------------------------------------------------------------------------

        hasDarkBackground = deriveBackgroundProps(props, isRtl, style);
        isBackgroundDerived = true;
      }
    });

    stylesRef.current = {
      innerElemStyle: style.inner,
      outerElemStyle: style.outer,
      elemStyle: addCombinedStyle
        ? { ...style.inner, ...style.outer }
        : stylesRef.current.elemStyle,
      padding,
      hasDarkBackground,
    };

    prevPropsRef.current = props;
    prevPropsListRef.current = propsList;
    prevAddCombinedStyle.current = addCombinedStyle;
    prevIsRtl.current = isRtl;
  }


  return stylesRef.current;
};

export default useStylingProps;
