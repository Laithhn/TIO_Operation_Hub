/** The props of the React component of the popup component "Confirm". */
export interface ConfirmProps {
  /** Optionally, an ID for the HTML attribute "id" of the confirm dialog, written in every build -
   * for example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** The actual query text must be passed to this mandatory prop. BBCodes can be used in this
   *  prop. */
  readonly question: string;
  /** Optionally, additional explanatory text can be displayed below the question (see Prop
   * question) using this prop. BBCodes can be used in this prop. */
  readonly hint?: string;
  /** This prop can be used to change the text of the button for rejecting the question. Default
   * value: "Cancel". */
  readonly labelButtonCancel?: string;
  /** This prop can be used to change the text of the button used to confirm the question. Default
   * value: "OK". */
  readonly labelButtonOk?: string;
  /** This callback prop can be assigned a function that is executed when the button is clicked to
   * reject. */
  readonly onClickCancel?: ({ event }: { event: KeyboardEvent | React.PointerEvent | React.MouseEvent | React.KeyboardEvent }) => void;
  /** This callback prop can be passed a function that is executed when the button is clicked to
   * confirm. */
  readonly onClickOk?: ({ event }: { event: KeyboardEvent | React.PointerEvent | React.MouseEvent | React.KeyboardEvent }) => void;
}
