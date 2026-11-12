import {
  color, getGround, type Ground, layout, space, spacePx, typo,
} from 'assets/styles';

import type {
  StylingPropCollection, StylingPropKeys, UseStylingPropsResult,
} from '../useStylingProps.types';


/**
 * The edge a sticky component takes in a right-to-left language: the two along the writing
 * direction swap, the two across it stay where they are.
 */
const mirroredStickyEdges = {
  top: 'top', bottom: 'bottom', left: 'right', right: 'left',
} as const;


/**
 *
 */
export const deriveProps = ({
  props: givenProps, usedPropKeys, isRtl, addCombinedStyle, darkTheme,
}: {
  readonly props: StylingPropCollection;
  readonly usedPropKeys: StylingPropKeys;
  readonly isRtl: boolean;
  readonly addCombinedStyle: boolean;
  readonly darkTheme?: boolean | undefined;
}): UseStylingPropsResult => {
  // The derivers read only the props the component lists. Several of them serve a group of props
  // and read the whole group once one member runs them: without this filter a listed padding would
  // carry an unlisted border radius into the style, and a listed background colour an unlisted
  // background image - applied in the browser while the type checker rejects the prop.
  const props = Object.fromEntries(
    usedPropKeys.map((propKey) => [propKey, givenProps[propKey]]),
  ) as StylingPropCollection;

  const res: UseStylingPropsResult = {
    innerElemStyle: {},
    outerElemStyle: {},
    padding: {
      top: 0, right: 0, bottom: 0, left: 0,
    },
    hasDarkBackground: false,
  };


  const derivePaddingAndBorderRadius = () => {
    // all of this props are only handled once at the first call
    if (!res.innerElemStyle.padding && !res.outerElemStyle.borderRadius) {
      const positions = ['Top', 'Right', 'Bottom', 'Left'];
      const dirPositions = isRtl ? ['Top', 'Left', 'Bottom', 'Right'] : positions;
      const corners = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'];
      let padding = new Array(4).fill(props.padding ? space[props.padding] : 0) as [number, number, number, number],
        borderRadius = new Array(4).fill(props.borderRadius ? space[props.borderRadius] : 0) as [number, number, number, number];

      // at first, derive the border values from props "markerTop", "markerRight", "markerBottom"
      // and "markerLeft".

      const markerFlags = positions.map((pos, idx) => {
        const property = `border${dirPositions[idx]}` as 'borderTop' | 'borderRight' | 'borderBottom' | 'borderLeft';
        const markerValue = props[`marker${pos}` as keyof StylingPropCollection] as StylingPropCollection['markerTop'];

        if (markerValue) {
          res.outerElemStyle[property] = `${layout.markerWidth}px solid ${color[markerValue]}`;
          return true;
        }
        return false;
      });

      // 2nd, derive the padding value from props "padding", "paddingTop", "paddingRight",
      // "paddingBottom", "paddingLeft" and from the marker flags above

      padding = padding.map((commonPaddingValue, idx) => {
        const singlePaddingValue = props[`padding${positions[idx]}` as keyof StylingPropCollection] as StylingPropCollection['padding'];

        let numericValue = singlePaddingValue ? space[singlePaddingValue] : commonPaddingValue;

        if (markerFlags[idx]) {
          numericValue = Math.max(0, numericValue - layout.markerWidth);
        }

        return numericValue;
      }) as [number, number, number, number];

      if (padding.some((paddingValue) => !!paddingValue)) {
        if (isRtl) {
          padding = [padding[0], padding[3], padding[2], padding[1]];
        }

        res.innerElemStyle.padding = padding.map((paddingValue) => `${paddingValue}px`).join(' ');
      }

      // 3rd, derive the border radius value from props "borderRadius", "borderTopLeftRadius",
      // "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius" and from the
      // marker flags.

      borderRadius = borderRadius.map((commonBorderRadiusValue, idx) => {
        const singleBorderRadiusValue = props[`border${corners[idx]}Radius` as keyof StylingPropCollection] as StylingPropCollection['borderRadius'];

        return singleBorderRadiusValue ? space[singleBorderRadiusValue] : commonBorderRadiusValue;
      }) as [number, number, number, number];

      if (borderRadius.some((borderRadiusValue) => !!borderRadiusValue)) {
        if (isRtl) {
          borderRadius = [borderRadius[1], borderRadius[0], borderRadius[3], borderRadius[2]];
        }

        res.outerElemStyle.borderRadius = borderRadius.map((borderRadiusValue) => `${borderRadiusValue}px`).join(' ');
      }

      ([res.padding.top, res.padding.right, res.padding.bottom, res.padding.left] = padding);
    }
  };


  const deriveBackground = () => {
    // all of this props are only handled once at the first call
    if (!res.outerElemStyle.background) {
      const { backgroundColor, backgroundImage, backgroundOptions } = props;
      const backgroundArr = [];
      let ground: Ground | undefined;

      // get the background color and the ground it sets for everything inside the element
      if (backgroundColor) {
        ground = getGround(backgroundColor);
        backgroundArr.push(color[backgroundColor]);
      }

      // get the background image
      if (backgroundImage) {
        backgroundArr.push(backgroundImage);

        // only if there is a background image, add the background options if available
        if (backgroundOptions) {
          backgroundArr.push(backgroundOptions);
        }
      }

      // build the background string
      if (backgroundArr.length > 0) {
        let background = backgroundArr.join(' ');

        if (isRtl) {
          background = background.replace(/left|right/, (match) => ((match === 'left') ? 'right' : 'left'));
        }

        res.outerElemStyle.background = background;
        res.hasDarkBackground = (ground === 'dark');

        if (ground) {
          res.outerElemStyle['--ground'] = ground;
        }
      }
    }
  };


  const derivers: Record<keyof StylingPropCollection, () => void> = {
    relativePosition: () => {
      if (props.relativePosition === true) {
        res.innerElemStyle.position = 'relative';
      }
    },
    stickyPosition: () => {
      if (props.stickyPosition) {
        const edge = isRtl ? mirroredStickyEdges[props.stickyPosition] : props.stickyPosition;

        // Sticky belongs to the outer element: it places the component inside the scroll area
        // around it, like the grid props above, not inside itself like "relativePosition".
        res.outerElemStyle.position = 'sticky';
        res.outerElemStyle[edge] = 0;
        // What the prop promises is that the rest passes underneath, and the default painting order
        // does not deliver it: a positioned box paints above plain content, but any element further
        // down the page that is positioned itself or opens a stacking context - a transform, a
        // filter, an opacity below 1 - lands in the same layer and, coming later, on top. The
        // lowest z-index lifts the sticky box out of that competition, and 1 is enough because the
        // framework hands out no other. The lift reaches no further than the content: every
        // content is a stacking context of its own (app/modules/content/dashboard.scss), so the
        // box never lies over a modal window or a notification.
        res.outerElemStyle.zIndex = 1;
      }
    },
    direction: () => {
      res.innerElemStyle.direction = props.direction;
    },
    gridArea: () => {
      res.outerElemStyle.gridArea = props.gridArea;
    },
    placeSelf: () => {
      res.outerElemStyle.placeSelf = props.placeSelf;
    },
    alignSelf: () => {
      res.outerElemStyle.alignSelf = props.alignSelf;
    },
    justifySelf: () => {
      res.outerElemStyle.justifySelf = props.justifySelf;
    },
    maxWidth: () => {
      if (props.maxWidth === 'textColumn') {
        res.outerElemStyle.maxWidth = typo.measure;
      }
    },
    visible: () => {
      if (props.visible === false) {
        res.outerElemStyle.visibility = 'hidden';
      }
    },
    gridTemplateRows: () => {
      res.innerElemStyle.gridTemplateRows = props.gridTemplateRows;
    },
    gridTemplateColumns: () => {
      res.innerElemStyle.gridTemplateColumns = props.gridTemplateColumns;
    },
    gridTemplateAreas: () => {
      res.innerElemStyle.gridTemplateAreas = props.gridTemplateAreas;
    },
    gridAutoFlow: () => {
      res.innerElemStyle.gridAutoFlow = props.gridAutoFlow;
    },
    gridAutoRows: () => {
      res.innerElemStyle.gridAutoRows = props.gridAutoRows;
    },
    gridAutoColumns: () => {
      res.innerElemStyle.gridAutoColumns = props.gridAutoColumns;
    },
    gap: () => {
      if (props.gap && Object.hasOwn(spacePx, props.gap)) {
        res.innerElemStyle.gap = spacePx[props.gap];
      }
    },
    rowGap: () => {
      if (props.rowGap && Object.hasOwn(spacePx, props.rowGap)) {
        res.innerElemStyle.rowGap = spacePx[props.rowGap];
      }
    },
    columnGap: () => {
      if (props.columnGap && Object.hasOwn(spacePx, props.columnGap)) {
        res.innerElemStyle.columnGap = spacePx[props.columnGap];
      }
    },
    placeContent: () => {
      res.innerElemStyle.placeContent = props.placeContent;
    },
    alignContent: () => {
      res.innerElemStyle.alignContent = props.alignContent;
    },
    justifyContent: () => {
      res.innerElemStyle.justifyContent = props.justifyContent;
    },
    placeItems: () => {
      res.innerElemStyle.placeItems = props.placeItems;
    },
    alignItems: () => {
      res.innerElemStyle.alignItems = props.alignItems;
    },
    justifyItems: () => {
      res.innerElemStyle.justifyItems = props.justifyItems;
    },
    padding: derivePaddingAndBorderRadius,
    paddingTop: derivePaddingAndBorderRadius,
    paddingRight: derivePaddingAndBorderRadius,
    paddingBottom: derivePaddingAndBorderRadius,
    paddingLeft: derivePaddingAndBorderRadius,
    markerTop: derivePaddingAndBorderRadius,
    markerRight: derivePaddingAndBorderRadius,
    markerBottom: derivePaddingAndBorderRadius,
    markerLeft: derivePaddingAndBorderRadius,
    borderRadius: derivePaddingAndBorderRadius,
    borderTopLeftRadius: derivePaddingAndBorderRadius,
    borderTopRightRadius: derivePaddingAndBorderRadius,
    borderBottomRightRadius: derivePaddingAndBorderRadius,
    borderBottomLeftRadius: derivePaddingAndBorderRadius,
    backgroundColor: deriveBackground,
    backgroundImage: deriveBackground,
    backgroundOptions: deriveBackground,
    // The pane of "contact" follows the ground the component sits on, which no inline style can: the
    // component draws it through a class of its own (see the mixin contactPane()).
    boxShadow: () => undefined,
    objectFit: () => {
      res.innerElemStyle.objectFit = props.objectFit;
    },
    objectPosition: () => {
      res.innerElemStyle.objectPosition = props.objectPosition;
    },
    textAlign: () => {
      res.innerElemStyle.textAlign = props.textAlign;
    },
    whiteSpace: () => {
      res.innerElemStyle.whiteSpace = props.whiteSpace;
    },
    textOverflowEllipsis: () => {
      if (props.textOverflowEllipsis === true) {
        if (!usedPropKeys.includes('whiteSpace')) {
          res.innerElemStyle.whiteSpace = 'nowrap';
        }

        res.innerElemStyle.textOverflow = 'ellipsis';
        res.innerElemStyle.overflow = 'hidden';
      }
    },
    overflowHidden: () => {
      if (props.overflowHidden === true) {
        res.innerElemStyle.overflow = 'hidden';
      }
    },
  } as const;


  usedPropKeys.forEach((propKey) => {
    derivers[propKey]();
  });

  // The ground the call site states wins over the one the background colour sets: a background
  // image has a brightness that no colour key states.
  if (typeof darkTheme === 'boolean') {
    res.outerElemStyle['--ground'] = darkTheme ? 'dark' : 'light';
    res.hasDarkBackground = darkTheme;
  }

  if (addCombinedStyle) {
    res.elemStyle = {
      ...res.innerElemStyle,
      ...res.outerElemStyle,
    };
  }

  return res;
};
