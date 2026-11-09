import type { StylingPropCollection } from 'components/hooks/useStylingProps';


export const imageStylingProps = [
  'gridArea',
  'placeSelf',
  'alignSelf',
  'justifySelf',
  'visible',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'markerTop',
  'markerRight',
  'markerBottom',
  'markerLeft',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
  'backgroundColor',
  'boxShadow',
  'objectFit',
  'objectPosition',
] as const;

export type ImageStylingProps = Pick<StylingPropCollection, (typeof imageStylingProps)[number]>;


export interface ImageHandle {
  clientLeft: Element['clientLeft'] | undefined;
  clientWidth: Element['clientWidth'] | undefined;
  clientTop: Element['clientTop'] | undefined;
  clientHeight: Element['clientHeight'] | undefined;
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
}


/** The props of the React component of the indicator component "Image". */
export interface ImageProps extends ImageStylingProps {
  /** The React reference of an imperative handle of the image component. */
  readonly ref?: React.Ref<ImageHandle | null>;
  /** Optionally, an ID for the HTML attribute "id" of the image container, written in every build -
   * for example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** This prop specifies the source of the image. The same rules apply as for the attribute of the
   * same name of the HTML element <img>. */
  readonly src?: string;
  /** Prop for optional input of alternative text, analogous to the attribute of the same name of
   * the HTML element <img>. */
  readonly alt?: string;
  /** Optional callback prop that is called as soon as the image is clicked. */
  readonly onClick?: ({ event }: { event: React.MouseEvent<HTMLImageElement> }) => void;
}
