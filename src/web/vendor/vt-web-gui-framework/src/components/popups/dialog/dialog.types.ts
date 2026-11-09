import type { StylingPropCollection } from 'components/hooks/useStylingProps';


// The dialog takes no radius props: it keeps the fixed rounding of its stylesheet (decided on
// 2026-09-25).
export const dialogStylingProps = [
  'gridTemplateRows',
  'gridTemplateColumns',
  'gridTemplateAreas',
  'gridAutoFlow',
  'gridAutoRows',
  'gridAutoColumns',
  'gap',
  'rowGap',
  'columnGap',
  'placeContent',
  'alignContent',
  'justifyContent',
  'placeItems',
  'alignItems',
  'justifyItems',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'markerTop',
  'markerRight',
  'markerBottom',
  'markerLeft',
  'textAlign',
] as const;

export type DialogStylingProps = Pick<StylingPropCollection, (typeof dialogStylingProps)[number]>;


/** The props of the React component of the popup component "Dialog". */
export type DialogProps = React.PropsWithChildren<{
  /** Optionally, an ID for the HTML attribute "id" of the dialog box, written in every build - for
   * example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** By setting this prop to true, no elements outside the dialog can be activated. The bubbling of
   * pointer and wheel events is suppressed. This means that the dialog must first be closed in
   * order to continue interacting with the rest of the website. */
  readonly exclusive?: boolean;
  /** Setting this prop to true only has an effect if the exclusive prop is also set to true. In
   * this case, the website behind the dialog is darkened with a dark, transparent color. */
  readonly dimmedBackground?: boolean;
} & DialogStylingProps>;
