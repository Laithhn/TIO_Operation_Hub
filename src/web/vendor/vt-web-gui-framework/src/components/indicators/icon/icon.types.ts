import type { Color } from 'assets/styles';
import type { StylingPropCollection } from 'components/hooks/useStylingProps';


export const iconStylingProps = [
  'gridArea',
  'placeSelf',
  'alignSelf',
  'justifySelf',
  'visible',
] as const;

export type IconStylingProps = Pick<StylingPropCollection, (typeof iconStylingProps)[number]>;


export interface IconHandle {
  clientLeft: Element['clientLeft'] | undefined;
  clientWidth: Element['clientWidth'] | undefined;
  clientTop: Element['clientTop'] | undefined;
  clientHeight: Element['clientHeight'] | undefined;
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
}


export const iconSize = Object.freeze({
  small: 16,
  normal: 20,
  large: 24,
  xl: 32,
});


/** The props of the React component of the indicator component "Icon". */
export interface IconProps extends IconStylingProps {
  /** The React reference of an imperative handle of the icon component. */
  readonly ref?: React.Ref<IconHandle | null>;
  /** This prop must be passed the name of the icon (see pacakge VtWebGuiIcons), upper/lower case
   * does not need to be taken into account. If the selected icon does not exist or this prop is not
   * set, the component will not be displayed. */
  readonly icon?: string;
  /** The desired height and width of the icon. Here, you can specify either a preset size or a
   * custom size as number in pixels. The latter should only be used in exceptional cases. Default
   * value: normal (20x20 pixels). */
  readonly size?: (keyof typeof iconSize) | number;
  /** This prop allows you to customize the color of the icon. */
  readonly color?: keyof Pick<Color, 'attention' | 'attentionHigh' | 'signalOk' | 'signalWarning' | 'signalError'>;
  /** Rotation of the icon in degrees. Positive values rotate the icon clockwise, negative values
   * rotate it counterclockwise. */
  readonly rotation?: number;
  /** Setting this prop to true displays the icon as inactive. */
  readonly disable?: boolean;
}
