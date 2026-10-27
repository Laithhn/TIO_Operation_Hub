import type { LabelForControlsProps } from 'components/helpers/labelForControls';
import type { StylingPropCollection } from 'components/hooks/useStylingProps';


export const checkBoxStylingProps = [
  'gridArea',
  'placeSelf',
  'alignSelf',
  'justifySelf',
  'visible',
] as const;

export type CheckBoxStylingProps = Pick<StylingPropCollection, (typeof checkBoxStylingProps)[number]>;


/** Enumeration for the status of the check box. */
export enum CheckBoxStatus {
  /** The check box is idle and can be used. */
  IDLE = 'IDLE',
  /** The check box is disabled. */
  DISABLED = 'DISABLED',
}


export interface CheckBoxHandle {
  clientLeft: Element['clientLeft'] | undefined;
  clientWidth: Element['clientWidth'] | undefined;
  clientTop: Element['clientTop'] | undefined;
  clientHeight: Element['clientHeight'] | undefined;
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
  focus: () => void;
  blur: () => void;
}


/** The type of a check box: a classic tick box or a radio button. A switch is no type of the check
 * box but a control of its own, "Switch" in components/controls/switch. */
export type CheckBoxType = 'tickBox' | 'radioButton';


/** The value of a check box: true for checked, false for unchecked, and "tickBoxMixed" for the
 * mixed value, which the type "tickBox" carries alone (see the prop "value" below). */
export type CheckBoxValue = boolean | 'tickBoxMixed';


/** The props of the React component of the control component "CheckBox". */
export interface CheckBoxProps extends CheckBoxStylingProps {
  /** The React reference of an imperative handle of the check box component. */
  readonly ref?: React.Ref<CheckBoxHandle | null>;
  /** Optionally, an ID for the HTML attribute "id" of the check box, written in every build - for
   * example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** This prop determines whether the check box is displayed as a classic tick box (default, value:
   * "tickBox") or as a radio button (value: "radioButton"). A control that says it turns something
   * on rather than that it selects a value is the "Switch" (components/controls/switch), meant for
   * projects on touch-only devices; wherever a pointer or a keyboard is in play, the check box is
   * the control to use. */
  readonly type?: CheckBoxType;
  /** Check boxes can be displayed larger by setting this prop to true, which also increases the
   * total height of the control. The size of the text remains the same. */
  readonly large?: boolean;
  /** This prop can be used to determine the status of the check box. By default, all check boxes
   * are in the idle status (CheckBoxStatus.IDLE). Using this prop, a check box can be disabled
   * (CheckBoxStatus.DISABLED), in which case it cannot be switched. Neither a wrong entry nor a
   * changed one is a status of the check box: an error is stated by the input control it belongs
   * to, a changed value by the form around it. */
  readonly status?: CheckBoxStatus;
  /** Optionally the label of the check box or no label if an empty string is passed. It names what
   * the check box switches, and the callback prop "onClick" is also called when the label is
   * clicked. BBCodes can be used in this prop. */
  readonly label?: string | number;
  /** By default, the label of the check boxes is displayed as value text with the standard font
   * size. However, it can also be displayed as label text if this property is set to the value
   * "label". Default value: "value". */
  readonly labelType?: LabelForControlsProps['labelType'];
  /** If this prop is set to true, the label, if present, is placed to the left of the check box icon
   * (for left-to-right languages). The label and the icon are then pushed apart to the two edges of
   * the control, which is what lets a column of check boxes named on the left carry their icons on
   * one edge. This only shows where the surrounding grid stretches the control - a check box as wide
   * as its content has nothing to distribute - so setting the styling prop "justifySelf" to "start"
   * keeps the two together. */
  readonly labelFirst?: boolean;
  /** With this prop set to true, the label will be wrapped if it is too long. By default, the label
   * is truncated if it is too long, with the truncated part replaced by "...". */
  readonly wrapLabel?: boolean;
  /** The current value of the check box: true for checked, false for unchecked, and "tickBoxMixed"
   * for the mixed value. The value "tickBoxMixed" is available for the type "tickBox" only: a
   * radio button knows checked and unchecked and nothing else, so setting it there displays the
   * radio button as unchecked. */
  readonly value?: CheckBoxValue;
  /** Callback prop that is called as soon as the check box is clicked. If the prop "isDisabled" is
   * set to true, this prop is not called. */
  readonly onClick?: ({ event }: { event: React.MouseEvent<HTMLSpanElement> | React.PointerEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement> }) => void;
}
