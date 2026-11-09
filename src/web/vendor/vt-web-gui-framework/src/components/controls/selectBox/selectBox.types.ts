import type { StylingPropCollection } from 'components/hooks/useStylingProps';


export const selectBoxStylingProps = [
  'gridArea',
  'justifySelf',
  'alignSelf',
  'placeSelf',
  'visible',
] as const;

export type SelectBoxStylingProps = Pick<StylingPropCollection, (typeof selectBoxStylingProps)[number]>;


/** Enumeration for the status of the select box. */
export enum SelectBoxStatus {
  /** The select box is idle and can be used. */
  IDLE = 'IDLE',
  /** The select box is busy. */
  BUSY = 'BUSY',
  /** The select box shows an error. */
  ERROR = 'ERROR',
  /** The select box is disabled. This is also what a select box with no selectable option shows:
   * it locks itself, a lock it can see for itself needing no status from the consumer. */
  DISABLED = 'DISABLED',
}


export interface SelectBoxHandle {
  clientLeft: Element['clientLeft'] | undefined;
  clientWidth: Element['clientWidth'] | undefined;
  clientTop: Element['clientTop'] | undefined;
  clientHeight: Element['clientHeight'] | undefined;
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
  focus: () => void;
  blur: () => void;
  showMenu: () => void;
  hideMenu: () => void;
}


/** The props of the React component of the control component "SelectBox". */
export interface SelectBoxProps<ValueType> extends SelectBoxStylingProps {
  /** The React reference of an imperative handle of the select box component. */
  readonly ref?: React.Ref<SelectBoxHandle | null>;
  /** Optionally, an ID for the HTML attribute "id" of the select box, written in every build - for
   * example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** This prop can be used to determine the status of the select box. By default, all select boxes
   * are in "idle" status. The select box can be displayed as "busy", faulty ("error"), or
   * "disabled" using this prop. No selection can be made in the "busy" and "disabled" status. A
   * changed selection is no status of the control; the form around it states such a thing. */
  readonly status?: SelectBoxStatus;
  /** A select box carries a pane of its own, which is what bounds it: it stands on an empty surface
   * and needs nothing arranged around it. Setting this prop to true takes that pane away, so the
   * surrounding layout does the bounding instead - a table whose rows are already divided by lines,
   * for example. The select box keeps its interaction appearance either way. */
  readonly bare?: boolean;
  /** This prop states that the select box ends without an edge of its own on one side ("start" or
   * "end") or on both ("both"), and what that means depends on whether it carries a pane: a select
   * box with one gives up its rounded corners on that side and its border along it, which is what
   * lets it be strung together with another control into one body. A bare select box pulls its inner
   * spacing back with a negative margin, so its selected option lines up with whatever sits above or
   * below it instead of appearing indented. */
  readonly flush?: 'start' | 'end' | 'both';
  /** If the width of the select box is not specified by the element in which it is located, the
   * width is based on the longest text of all options. If this prop is set to true, the select box
   * is always only as wide as the currently selected option. This prop is particularly useful on a
   * select box without a pane (see prop "bare"). */
  readonly dense?: boolean;
  /** By default, the selection menu is displayed in such a way that as many options as possible are
   * visible. If the height of the selection menu exceeds that of the browser window, the height of
   * the menu is restricted and a scroll bar is displayed. This prop can be used to manually
   * restrict the height of the selection menu. The value passed corresponds to the number of
   * visible options, whereby the height of the browser window cannot be exceeded. */
  readonly limitMenu?: number;
  /** If no or only disabled options are available, meaning that no selection can be made, no text
   * is displayed in the select box by default. In this case, the selection menu cannot be opened.
   * With this prop, a note text can be given to the select box, that is displayed in italics. */
  readonly emptyHint?: string;
  /** If a value (see prop "value") is passed to the select box that does not appear in the options,
   * the first non-disabled option is automatically selected by default. If the prop "noSelection"
   * is assigned the value true or a string, no option is selected in these cases (the Prop
   * "onSelect" returns the value null). A transferred string is displayed as a note in italics. In
   * addition, an icon button appears to delete a selection that has been made. The delete key can
   * also be used for this purpose. */
  readonly noSelection?: boolean | string;
  /** If this prop is set to true, options can be selected by scrolling the mouse wheel on the
   * select box when the selection menu is closed. */
  readonly selectByWheel?: boolean;
  /** Setting this prop to true displays a button at the end of the select box for deleting the
   * selection. */
  readonly deleteButton?: boolean;
  /** An array containing the options that can be displayed and selected in the select box. Each
   * option corresponds to an object. */
  readonly options?: {
    /** The internal value of the option, which must be specified and unique. */
    readonly value: ValueType;
    /** The text of the option that is displayed in the selection menu and, when selected, in the
     * select box. If no text is specified, the value is displayed. */
    readonly text?: string;
    /** If this field is set to true, this option is disabled and cannot be selected. */
    readonly isDisabled?: boolean;
    /** If this field is set to true, the text of the option ("text") is displayed in italics in the
     * selection menu and, if selected, in the select box. */
    readonly isItalic?: boolean;
    /** The writing direction of this one option's text, overwriting the general setting - for a list
     * whose entries are not all written in the same direction, a language chooser above all. It
     * applies in the selection menu alone: the selected option, shown in the select box itself,
     * follows the direction of its surroundings like every other value a control holds. */
    readonly dir?: React.CSSProperties['direction'];
  }[];
  /** The value of the currently selected option. If "value" is not set or null, no option is
   * selected. If the "noSelection" prop is false, the first non-disabled option is automatically
   * selected. */
  readonly value?: ValueType | null;
  /** This prop can be used to display a note or error text, e.g. an incorrect entry below the
   * select box. If the prop "status" is simultaneously set to "error", the notice is highlighted in
   * color as error text. */
  readonly notice?: string | number;
  /** Callback prop that is called as soon as an option is selected. This can be done through user
   * interaction (mouse wheel on the selection list, mouse wheel on the selection menu, click on a
   * non-disabled option in the selection menu). Clicking on the already selected option also
   * triggers this function. However, a selection and thus a call to "onSelect" can also occur
   * automatically if the value passed via the "value" prop is invalid and another option or no
   * option at all is automatically selected as a result. Resetting a selection by pressing the
   * Escape key also triggers this function, but only if the value has changed beforehand. */
  readonly onSelect?: ({ value, event }: { value: ValueType | null; event?: KeyboardEvent | React.KeyboardEvent<HTMLSpanElement> | React.MouseEvent<SVGElement | HTMLDivElement> | React.TouchEvent<HTMLSpanElement> | React.WheelEvent<HTMLSpanElement> }) => void;
}
