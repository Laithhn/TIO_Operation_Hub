import type { Color, typo } from 'assets/styles';
import type { StylingPropCollection } from 'components/hooks/useStylingProps';


/** Enumeration for the status of the value field. */
export enum ValueFieldStatus {
  /** The value field is idle and can be used. */
  IDLE = 'IDLE',
  /** The data for the value field are not yet loaded. */
  LOADING = 'LOADING',
  /** The value field is disabled. */
  DISABLED = 'DISABLED',
}


export const valueFieldStylingProps = [
  'gridArea',
  'placeSelf',
  'alignSelf',
  'justifySelf',
  'alignContent',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
  'backgroundColor',
  'backgroundImage',
  'backgroundOptions',
  'boxShadow',
  'whiteSpace',
  'textOverflowEllipsis',
] as const;

export type ValueFieldStylingProps = Pick<StylingPropCollection, (typeof valueFieldStylingProps)[number]>;


export interface ValueFieldHandle {
  clientLeft: Element['clientLeft'] | undefined;
  clientWidth: Element['clientWidth'] | undefined;
  clientTop: Element['clientTop'] | undefined;
  clientHeight: Element['clientHeight'] | undefined;
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
}


/** The props of the React component of the indicator component "ValueField". */
export interface ValueFieldProps extends ValueFieldStylingProps {
  /** The React reference of an imperative handle of the value field component. */
  readonly ref?: React.Ref<ValueFieldHandle | null>;
  /** Optionally, an ID for the HTML attribute "id" of the value field, written in every build - for
   * example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** Optionally, the ground the value field letters itself for: true for a dark one, false for a
   * light one. Without it, a field with a "backgroundColor" takes the ground that colour makes, and
   * one without takes the ground it sits on. Set it where the field carries a "backgroundImage":
   * whether an image is dark or light cannot be derived from it, so the call site says so. It wins
   * over the ground of the colour whenever it is set. */
  readonly darkTheme?: boolean;
  /** This prop can be used to set the heading of the value field. */
  readonly title?: string;
  /** By setting this prop to true, the heading, if specified, will be displayed as a label in a
   * slightly smaller font. */
  readonly titleAsLabel?: boolean;
  /** This prop sets the value to be displayed in the value field. */
  readonly value?: string | number;
  /** With this prop, a unit can optionally be appended to the value. */
  readonly unit?: string;
  /** This prop can be used to display additional text or notes below the value. BBCodes can be used
   * in this prop. */
  readonly hint?: string;
  /** This prop can be used to specify the status of the value field. By default, all value fields
   * are in idle status (ValueFieldStatus.IDLE). This prop can be used to disable the value fields
   * (ValueFieldStatus.DISABLED) or display them in a loading status (ValueFieldStatus.LOADING) if
   * no data is available for display yet. */
  readonly status?: ValueFieldStatus;
  /** This prop allows the value of the value field to be displayed in different font sizes. The
   * following values are available: "normal" (default), "large", "xl" and "xxl". */
  readonly valueSize?: keyof Pick<typeof typo.fontSize, 'normal' | 'large' | 'xl' | 'xxl'>;
  /** This prop can be used to change the font color of the value. The following colors are
   * available: blue accent color ("attention"), orange accent color ("attentionHigh"), green
   * ("signalOk"), yellow ("signalWarning") and red signal color ("signalError"). */
  readonly valueColor?: keyof Pick<Color, 'attention' | 'attentionHigh' | 'signalOk' | 'signalWarning' | 'signalError'>;
  /** An optional callback prop that is called when the value field is clicked. However, the value
   * field can only be clicked if this function is set. */
  readonly onClick?: ({ event }: { event: React.MouseEvent<HTMLDivElement> }) => void;
}
