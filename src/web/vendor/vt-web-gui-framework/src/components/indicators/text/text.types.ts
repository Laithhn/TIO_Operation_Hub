import type { Color, typo } from 'assets/styles';
import type { StylingPropCollection } from 'components/hooks/useStylingProps';


export const textStylingProps = [
  'gridArea',
  'placeSelf',
  'alignSelf',
  'justifySelf',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'textAlign',
  'whiteSpace',
  'textOverflowEllipsis',
] as const;

export type TextStylingProps = Pick<StylingPropCollection, (typeof textStylingProps)[number]>;


export interface TextHandle {
  clientLeft: Element['clientLeft'] | undefined;
  clientWidth: Element['clientWidth'] | undefined;
  clientTop: Element['clientTop'] | undefined;
  clientHeight: Element['clientHeight'] | undefined;
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
}


/** The props of the React component of the indicator component "Text". */
export type TextProps = React.PropsWithChildren<{
  /** The React reference of an imperative handle of the text component. */
  readonly ref?: React.Ref<TextHandle | null>;
  /** This prop defines the type of text: it can be a "headline", a "title", a "label", a value or
   * normal text ("value") or a hint text ("hint"). Default: "value". */
  readonly type?: keyof typeof typo.typoSet;
  /** If the type of a text field (prop "type") is set to "value", the font size can be changed
   * using this prop. Possible values are "small" (default value), "normal", "large", "xl" and
   * "xxl". */
  readonly size?: keyof Pick<typeof typo.fontSize, 'small' | 'normal' | 'large' | 'xl' | 'xxl'>;
  /** This prop can be used to change the font color. The following colors are available: blue
   * accent color ("attention"), orange accent color ("attentionHigh"), green ("signalOk"), yellow
   * ("signalWarning") and red signal color ("signalError"). This prop is only available if the text
   * field type (prop "type") is set to "value". */
  readonly color?: keyof Pick<Color, 'attention' | 'attentionHigh' | 'signalOk' | 'signalWarning' | 'signalError'>;
  /** By setting this prop to true, the text is displayed in a monotype font. The text type must be
   * "value" for this, see prop "type". */
  readonly monotype?: boolean;
  /** Setting this prop to true displays the text field as inactive. */
  readonly disable?: boolean;
} & TextStylingProps>;
