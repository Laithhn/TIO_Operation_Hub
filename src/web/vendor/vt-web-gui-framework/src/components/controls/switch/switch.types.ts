import type { LabelForControlsProps } from 'components/helpers/labelForControls';
import type { StylingPropCollection } from 'components/hooks/useStylingProps';


export const switchStylingProps = [
  'gridArea',
  'placeSelf',
  'alignSelf',
  'justifySelf',
  'visible',
] as const;

export type SwitchStylingProps = Pick<StylingPropCollection, (typeof switchStylingProps)[number]>;


/** Enumeration for the status of the switch. */
export enum SwitchStatus {
  /** The switch is idle and can be used. */
  IDLE = 'IDLE',
  /** The switch is disabled. */
  DISABLED = 'DISABLED',
}


export interface SwitchHandle {
  clientLeft: Element['clientLeft'] | undefined;
  clientWidth: Element['clientWidth'] | undefined;
  clientTop: Element['clientTop'] | undefined;
  clientHeight: Element['clientHeight'] | undefined;
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
  focus: () => void;
  blur: () => void;
}


/** The props of the React component of the control component "Switch". */
export interface SwitchProps extends SwitchStylingProps {
  /** The React reference of an imperative handle of the switch component. */
  readonly ref?: React.Ref<SwitchHandle | null>;
  /** Optionally, an ID for the HTML attribute "id" of the switch, written in every build - for
   * example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** This prop can be used to determine the status of the switch. By default, all switches are in
   * the idle status (SwitchStatus.IDLE). Using this prop, a switch can be disabled
   * (SwitchStatus.DISABLED), in which case it cannot be switched. Neither a wrong entry nor a
   * changed one is a status of the switch: an error is stated by the input control it belongs to,
   * and what a switch switches takes effect at once, so there is no changed value to state. */
  readonly status?: SwitchStatus;
  /** Optionally the label of the switch or no label if an empty string is passed. It names what the
   * switch turns on, and the callback prop "onClick" is also called when the label is clicked.
   * BBCodes can be used in this prop. */
  readonly label?: string | number;
  /** By default, the label of the switch is displayed as value text with the standard font size.
   * However, it can also be displayed as label text if this property is set to the value "label".
   * Default value: "value". */
  readonly labelType?: LabelForControlsProps['labelType'];
  /** If this prop is set to true, the label, if present, is placed to the left of the switch's pane
   * (for left-to-right languages). The label and the pane are then pushed apart to the two edges of
   * the control, which is what lets a column of switches named on the left carry their panes on one
   * edge. This only shows where the surrounding grid stretches the control - a switch as wide as
   * its content has nothing to distribute - so setting the styling prop "justifySelf" to "start"
   * keeps the two together. */
  readonly labelFirst?: boolean;
  /** With this prop set to true, the label will be wrapped if it is too long. By default, the label
   * is truncated if it is too long, with the truncated part replaced by "...". */
  readonly wrapLabel?: boolean;
  /** The current value of the switch: true for on, false for off. A switch knows on and off and
   * nothing else, so unlike the check box it carries no mixed value. Default value: false. */
  readonly value?: boolean;
  /** Callback prop that is called as soon as the switch is clicked. If the prop "status" is set to
   * SwitchStatus.DISABLED, this prop is not called. */
  readonly onClick?: ({ event }: { event: React.MouseEvent<HTMLSpanElement> | React.PointerEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement> }) => void;
}
