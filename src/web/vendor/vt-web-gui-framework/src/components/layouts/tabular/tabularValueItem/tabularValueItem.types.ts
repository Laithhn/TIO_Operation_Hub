import type { Color, typo } from 'assets/styles';

import type { TabularItemInjectedProps } from '../tabular.types';


/** Enumeration for the status of the value of a tabular value item. */
export enum TabularValueItemStatus {
  /** The tabular value item is idle and can be used. */
  IDLE = 'IDLE',
  /** The data for the tabular value item are not yet loaded. */
  LOADING = 'LOADING',
  /** The tabular value item is disabled. */
  DISABLED = 'DISABLED',
}


/**
 * The value item has no public styling props: it is placed and spaced by the tabular alone. This list
 * holds the spacing, colour and radius props that the tabular injects (see
 * "TabularItemInjectedProps") and is handed to the hook "useStylingProps", so that they are derived
 * like any other styling prop, mirroring included for right-to-left languages.
 */
export const tabularValueItemUsedStylingProps = [
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'backgroundColor',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
] as const;


/** The props of the React sub-component "TabularValueItem" of the layout component "Tabular". */
export interface TabularValueItemProps extends TabularItemInjectedProps {
  /** Optionally, an ID for the HTML attribute "id" of the value item, written in every build - for
   * example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** The label of the value, displayed at the start of the item. BB code is supported. */
  readonly label?: string;
  /** The maximum width of the label as a CSS value or as a number of pixels, default value:
   * "max-content". */
  readonly labelMaxWidth?: string | number;
  /** An optional hint text, displayed between the label and the value. BB code is supported. */
  readonly hint?: string;
  /** An optional second label, displayed below the label. BB code is supported. */
  readonly subLabel?: string;
  /** The status of the value item. This prop can be used to disable the value item
   * (TabularValueItemStatus.DISABLED) or to display a spinner instead of the value
   * (TabularValueItemStatus.LOADING) if no data is available for display yet. */
  readonly status?: TabularValueItemStatus;
  /** This prop allows the value to be displayed in a smaller font size. */
  readonly valueSize?: keyof Pick<typeof typo.fontSize, 'small' | 'normal'>;
  /** This prop can be used to change the font color of the value. It is only applied at the status
   * TabularValueItemStatus.IDLE. */
  readonly valueColor?: keyof Pick<Color, 'attention' | 'attentionHigh' | 'signalOk' | 'signalWarning' | 'signalError'>;
  /** The value of the tabular value item. */
  readonly children?: React.ReactNode;
}
