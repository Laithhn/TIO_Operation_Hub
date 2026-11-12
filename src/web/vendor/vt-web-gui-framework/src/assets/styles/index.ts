import { isNumber } from 'utils/type';

import { color, ground } from './color/_index';
import { layout } from './layout/_index';
import { space, spacePx } from './space/_index';
import { typo } from './typo/_index';


type Color = typeof color;
type ColorKeys = keyof Color;
type Ground = (typeof ground)[keyof typeof ground];
type Space = typeof space;
type SpaceKeys = keyof Space;
type SpacePx = typeof spacePx;
type SpacePxKeys = keyof SpacePx;
type TypoColorKeys = keyof typeof typo.color.dark;
type TypoColorClassName = `typoColor${Capitalize<TypoColorKeys>}`;


const spaceThresholds = Object.freeze((Object.keys(space) as SpaceKeys[])
  .toSorted((keyA, keyB) => {
    if (space[keyA] < space[keyB]) {
      return -1;
    }
    if (space[keyA] > space[keyB]) {
      return 1;
    }
    return 0;
  })
  .reduce<{ key: SpaceKeys; highTh: number }[]>((acc, key, idx) => {
    const res = [...acc, { key, highTh: space[key] }];
    const prevTh = res[idx - 1];

    if (prevTh) {
      prevTh.highTh = (prevTh.highTh + space[key]) / 2;
    }

    return res;
  }, []));


/**
 * Function to return the ground a colour of the palette makes as a background, the TypeScript
 * counterpart of the ground map in color/_index.scss: a component that paints a colour key of its
 * own at runtime sets this ground on the element it paints. A key without a ground of its own -
 * invisible, which lets the ground below show through - returns undefined, and the element sets
 * none.
 */
const getGround = (key: ColorKeys): Ground | undefined => (
  Object.hasOwn(ground, key) ? ground[key as keyof typeof ground] : undefined
);


/**
 * Function to check whether a colour of the palette makes a dark ground as a background.
 */
const isDarkColor = (key: ColorKeys): boolean => (getGround(key) === 'dark');


/**
 * Function to return the class that colours a lettering by a key of the typo colours, from the CSS
 * module of a component whose stylesheet includes the mixin typoColorClasses(). The class takes
 * the colour for the ground the lettering sits on, so the component names the colour and CSS
 * resolves the ground.
 */
const getTypoColorClass = (
  cssModule: Readonly<Record<TypoColorClassName, string>>,
  key: TypoColorKeys,
): string => cssModule[`typoColor${key.charAt(0).toUpperCase()}${key.slice(1)}` as TypoColorClassName];


/**
 * Function to return a colour of the palette carrying an alpha value, the TypeScript counterpart of
 * the SCSS function colorA(): a component that picks its colour at runtime, from a prop for
 * instance, cannot reach that function. The palette states its colours as six-digit hex values,
 * which this reads into the three channels; anything else is returned unchanged, which covers
 * "invisible" - a colour that is fully transparent already.
 */
const colorA = (key: ColorKeys, alpha: number): string => {
  const value = color[key];

  if (!(/^#[\da-f]{6}$/i).test(value)) {
    return value;
  }

  return `rgba(${[1, 3, 5].map((idx) => parseInt(value.slice(idx, idx + 2), 16)).join(', ')}, ${alpha})`;
};


/**
 * Function to return the key of the space closest to a given number of pixels. If the given value
 * is invalid, undefined is returned.
 */
const getSpaceKeyFromValue = (value: number): SpaceKeys | undefined => (
  (isNumber(value, { withoutNaN: true }))
    ? (spaceThresholds.find(({ highTh }) => (value < highTh)) ?? spaceThresholds[spaceThresholds.length - 1])?.key
    : undefined
);


export type {
  Color, ColorKeys, Ground, Space, SpaceKeys, SpacePx, SpacePxKeys, TypoColorKeys,
};

export {
  color, colorA, getGround, getSpaceKeyFromValue, getTypoColorClass, isDarkColor, layout, space, spacePx, typo,
};
