import type { StylingPropCollection } from 'components/hooks/useStylingProps';


export const multiSelectBoxStylingProps = [
  'gridArea',
  'justifySelf',
  'alignSelf',
  'placeSelf',
  'visible',
] as const;

export type MultiSelectBoxStylingProps = Pick<StylingPropCollection, (typeof multiSelectBoxStylingProps)[number]>;


/** Enumeration for the status of the multiple select box. */
export enum MultiSelectBoxStatus {
  /** The multiple select box is idle and can be used. */
  IDLE = 'IDLE',
  /** The multiple select box is busy. */
  BUSY = 'BUSY',
  /** The multiple select box shows an error. */
  ERROR = 'ERROR',
  /** The multiple select box is disabled. This is also what a multiple select box with no
   * selectable option shows: it locks itself, a lock it can see for itself needing no status from
   * the consumer. */
  DISABLED = 'DISABLED',
}


export interface MultiSelectBoxHandle {
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


/** The props of the React component of the control component "MultiSelectBox". */
export interface MultiSelectBoxProps extends MultiSelectBoxStylingProps {
  /** The React reference of an imperative handle of the multiple select box component. */
  readonly ref?: React.Ref<MultiSelectBoxHandle | null>;
  /** Optionally, an ID for the HTML attribute "id" of the multiple select box, written in every
   * build - for example to find it in automated tests. It has to be unique in the whole document,
   * and IDs starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** This prop can be used to determine the status of the multiple select box. By default, all
   * multiple select boxes are in "idle" status. The multiple select box can be displayed as "busy",
   * faulty ("error"), or "disabled" using this prop. No selection can be made in the "busy" and
   * "disabled" status. A changed selection is no status of the control; the form around it states
   * such a thing. */
  readonly status?: MultiSelectBoxStatus;
  /** A multiple select box carries a pane of its own, which is what bounds it: it stands on an empty
   * surface and needs nothing arranged around it. Setting this prop to true takes that pane away, so
   * the surrounding layout does the bounding instead - a table whose rows are already divided by
   * lines, for example. The multiple select box keeps its interaction appearance either way. */
  readonly bare?: boolean;
  /** This prop states that the multiple select box ends without an edge of its own on one side
   * ("start" or "end") or on both ("both"), and what that means depends on whether it carries a
   * pane: a multiple select box with one gives up its rounded corners on that side and its border
   * along it, which is what lets it be strung together with another control into one body. A bare
   * multiple select box pulls its inner spacing back with a negative margin, so its selection text
   * lines up with whatever sits above or below it instead of appearing indented. */
  readonly flush?: 'start' | 'end' | 'both';
  /** By default, the selection menu is displayed in such a way that as many options as possible are
   * visible. If the height of the selection menu exceeds that of the browser window, the height of
   * the menu is restricted and a scroll bar is displayed. This prop can be used to manually
   * restrict the height of the selection menu. The value passed corresponds to the number of
   * visible options, whereby the height of the browser window cannot be exceeded. */
  readonly limitMenu?: number;
  /** If setting this prop to true, the check box for selecting all or none of the options will not
   * appear in the menu. */
  readonly hideAllOrNoneCheckbox?: boolean;
  /** Setting this prop to true adds a search field to the selection menu, which can be used to
   * filter the displayed options. */
  readonly searchBox?: boolean;
  /** If no or only disabled options are available, meaning that no selection can be made, no text
   * is displayed in the multiple select box by default. In this case, the selection menu cannot be
   * opened. With this prop, a note text can be given to the select box, that is displayed in
   * italics. */
  readonly emptyHint?: string;
  /** By default, the multiple select box displays all selected values as a comma-separated string,
   * and this text is truncated if it is too long. Therefore, no line break occurs. This prop allows
   * you to display custom text, where the optional placeholders “%0” and “%1” in the text are
   * replaced by the number of selected options and the total number of options, respectively.
   * Alternatively, a function can be passed to this prop. This function receives the number of
   * selected options and the total number of all options as arguments. The return value is then
   * displayed in the multiple select box. */
  readonly selectionText?: string | (({ numSelected, numOptions }: { numSelected: number; numOptions: number }) => string);
  /** If a value is given to this prop, the multiple select box shows it in place of the selection
   * text while no option is selected, in the italics of a hint, and the header of its menu repeats
   * it. It takes precedence over the prop "selectionText". */
  readonly noSelectionHint?: string;
  /** If a value is given to this prop, the multiple select box shows it in place of the selection
   * text while every option is selected, and the header of its menu repeats it. It takes precedence
   * over the prop "selectionText". */
  readonly allSelectedHint?: string;
  /** The multiple selectable options to be displayed and their metadata. */
  readonly options?: {
    /** The ID of the option. */
    readonly id: string;
    /** Optionally an alternative text that is displayed instead of the ID. */
    readonly text?: string;
    /** An optional number (quantity) that appears in parentheses after the text. */
    readonly num?: number;
    /** If this field is set to true, this option is disabled and cannot be selected. */
    readonly isDisabled?: boolean;
  }[];
  /** This prop receives the current status indicating whether the options listed under the prop
   * "options" are selected or not. The content of this object consists of key-value pairs, where
   * the values can be arbitrary since they are evaluated as truthy or falsy.  */
  readonly values?: Record<string, unknown>;
  /** This prop can be used to display a note or error text, e.g. an incorrect entry below the
   * multiple select box. If the prop "status" is simultaneously set to "error", the notice is
   * highlighted in color as error text. */
  readonly notice?: string | number;
  /** Callback prop that is called as soon as an option is selected. */
  readonly onSelect?: ({ values, event }: { values: Record<string, unknown>; event: React.MouseEvent<HTMLSpanElement> | React.PointerEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement> }) => void;
}
