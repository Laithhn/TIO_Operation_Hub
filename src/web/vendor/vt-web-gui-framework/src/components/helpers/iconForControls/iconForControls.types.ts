/** The props of the React component of the helper component "IconForControls". */
export interface IconForControlsProps {
  readonly disable?: boolean;
  readonly icon?: string;
  readonly showSpinner?: boolean;
  readonly onPointerDown?: React.PointerEventHandler<SVGElement>;
  readonly onClick?: React.MouseEventHandler<SVGElement>;
}
