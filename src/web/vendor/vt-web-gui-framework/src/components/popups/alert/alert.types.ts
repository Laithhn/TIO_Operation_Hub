/** The props of the React component of the popup component "Alert". */
export interface AlertProps {
  /** Optionally, an ID for the HTML attribute "id" of the alert dialog, written in every build -
   * for example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** The actual message text must be passed to this mandatory prop. BBCodes can be used in this
   *  prop. */
  readonly text: string;
  /** Optionally, additional information can be displayed below the message text (see Prop text)
   * using this prop. BBCodes can be used in this prop. */
  readonly hint?: string;
  /** This prop can be used to change the text of the button used to confirm the message. Default#
   * value: "OK". */
  readonly labelButtonOk?: string;
  /** If this callback prop is passed a function, a button appears in the alert dialog to confirm
   * the message. Clicking on this button executes the function. If this prop is not set, no button
   * appears. In this case, the alert dialog can no longer be closed by the user, but only from the
   * program code (e.g., after a timeout). */
  readonly onClickOk?: ({ event }: { event: KeyboardEvent | React.PointerEvent | React.MouseEvent | React.KeyboardEvent }) => void;
}
