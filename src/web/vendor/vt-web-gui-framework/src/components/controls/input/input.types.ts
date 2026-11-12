import type { StylingPropCollection } from 'components/hooks/useStylingProps';

import type { Icons } from 'VtWebGuiIcons/src';


export const inputStylingProps = [
  'gridArea',
  'placeSelf',
  'alignSelf',
  'justifySelf',
  'visible',
] as const;

export type InputStylingProps = Pick<StylingPropCollection, (typeof inputStylingProps)[number]>;


export interface InputHandle {
  clientLeft: Element['clientLeft'] | undefined;
  clientWidth: Element['clientWidth'] | undefined;
  clientTop: Element['clientTop'] | undefined;
  clientHeight: Element['clientHeight'] | undefined;
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
  focus: () => void;
  blur: () => void;
  select: () => void;
}


/** Enumeration for the status of the input field. */
export enum InputStatus {
  /** The input field is idle and can be used. */
  IDLE = 'IDLE',
  /** The input field is busy. */
  BUSY = 'BUSY',
  /** The input field shows an error. */
  ERROR = 'ERROR',
  /** The input field is disabled. */
  DISABLED = 'DISABLED',
}


/** The props of the React component of the control component "Input". */
export interface InputProps extends InputStylingProps {
  /** The React reference of an imperative handle of the input component. */
  readonly ref?: React.Ref<InputHandle | null>;
  /** Optionally, an ID for the HTML attribute "id" of the input element, written in every build -
   * for example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** This prop specifies the type of the input field. Currently, general text input ("text",
   * default), input for integers ("number"), input for floating point numbers ("float") and
   * password input ("password") are available. */
  readonly type?: 'text' | 'number' | 'float' | 'password';
  /** This prop can be used to determine the status of the input field. By default, all input fields
   * are in idle status (InputStatus.IDLE). The input fields can be displayed as "busy"
   * (InputStatus.BUSY), faulty (InputStatus.ERROR) or disabled (InputStatus.DISABLED) using this
   * prop. No input can be made in the BUSY and DISABLED statuses. A changed value is no status of
   * the control; the form around it states such a thing. */
  readonly status?: InputStatus;
  /** This prop corresponds to the "size" attribute of HTML <input> elements. If a value greater
   * than 0 is entered, this attribute is set internally. Note that the consideration of this
   * attribute depends on the horizontal alignment of the element in the CSS grid. */
  readonly size?: number;
  /** An input field carries a pane of its own, which is what bounds it: it stands on an empty
   * surface and needs nothing arranged around it. Setting this prop to true takes that pane away,
   * so the surrounding layout does the bounding instead - a table whose rows are already divided by
   * lines, for example. The field keeps its interaction appearance either way. */
  readonly bare?: boolean;
  /** This prop states that the input field ends without an edge of its own on one side ("start" or
   * "end") or on both ("both"), and what that means depends on whether it carries a pane: a field
   * with one gives up its rounded corners on that side and its border along it, which is what lets
   * it be strung together with another control into one body. A bare field pulls its inner spacing
   * back with a negative margin, so its value lines up with whatever sits above or below it instead
   * of appearing indented. */
  readonly flush?: 'start' | 'end' | 'both';
  /** This prop can be used to align the value within the input field horizontally. */
  readonly textAlign?: React.CSSProperties['textAlign'];
  /** Setting this prop to true displays a button at the end of the input field for deleting the
   * entire input. */
  readonly deleteButton?: boolean;
  /** Any symbol can be displayed at the end of text input fields (type is "text"). To do this, this
   * prop must be passed the name of the symbol (see indicator component "ICON"). */
  readonly trailingIcon?: Icons;
  /** A suggestion list can be passed to text input fields (type is "text") as an array, from which
   * the user can select a value based on their input. A suitable value can then be selected using
   * the mouse, the arrow keys (up and down) or the return key. It is also possible to enter a value
   * that doesn't appear in the list. */
  readonly proposalList?: (string | number)[];
  /** If no suggestions are found in the suggestion list (see prop "proposalList") based on the
   * input, the note text passed here can be displayed in the list. */
  readonly noProposalHint?: string;
  /** For numeric input fields (type is "number" or "float"), buttons with arrows are displayed that
   * can be used to increment and decrement the displayed value. This prop can be used to set the
   * increment size. It is also possible to change the value using the arrow keys (up and down). */
  readonly increment?: number;
  /** For numeric input fields (type is "number" or "float"), this can be used to specify the
   * smallest possible value. */
  readonly min?: number;
  /** For numeric input fields (type is "number" or "float"), this can be used to specify the
   * largest possible value. */
  readonly max?: number;
  /** For password input fields (type is "password"), the password can be made visible by setting
   * this prop to true. This displays a clickable icon at the end of the input field, which can be
   * used to toggle the visibility. */
  readonly passwordVisibilityToggle?: boolean;
  /** This prop corresponds to the HTML attribute "autocomplete". An entered value is passed
   * directly to the <input> element used internally. */
  readonly autoComplete?: string;
  /** This prop corresponds to the HTML attribute "placeholder". An entered value is passed directly
   * to the <input> element used internally. */
  readonly placeholder?: string;
  /** The value to be displayed in the input field. Note that null will cause an empty input
   * field. */
  readonly value?: string | number | null;
  /** This prop can be used to display a note or error text, e.g. at an incorrect entry, below the
   * input field. If the prop status is simultaneously set to InputStatus.ERROR, the notice is
   * highlighted in color as error text. */
  readonly notice?: string | number;
  /** Callback prop that is called as soon as the input is changed by user interaction and before it
   * is accepted. This makes it possible to check the input and, in the event of an incorrect entry,
   * cancel it so that the entered character is not accepted. Please note that this function is not
   * called when entering data by pasting from the clipboard. In this case, use the Prop "onPaste".
   */
  readonly onBeforeInput?: ({ event }: { event: React.InputEvent<HTMLInputElement> }) => void;
  /** Callback prop that is called as soon as characters from the clipboard are to be inserted and
   * before they are accepted. This makes it possible to check the characters to be inserted and
   * cancel them in the event of an incorrect entry. */
  readonly onPaste?: ({ event }: { event: React.ClipboardEvent<HTMLInputElement> }) => void;
  /** Callback prop that is called with the new value of the input field as "value". For numeric
   * input fields (type is "number" or "float"), this is of type number, or null if the field is
   * empty. Besides every input made by the user, it is called for a value the field had to make
   * itself out of what it was given: one it had to parse, one it had to clamp into the range of the
   * props "min" and "max", or one it had to drop because prop "type" changed. A value handed in
   * through prop "value" that the field takes over as it stands is not reported back - it is
   * already what the content holds. */
  readonly onChange?: ({ value, event }: { value: string | number | null; event?: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<SVGElement | HTMLDivElement> | React.PointerEvent<SVGElement> | React.KeyboardEvent<SVGElement | HTMLInputElement> }) => void;
  /** Callback prop that is called as soon as the input element loses focus. */
  readonly onBlur?: ({ value, event }: { value: string | number | null; event: React.FocusEvent<HTMLInputElement> }) => void;
}
