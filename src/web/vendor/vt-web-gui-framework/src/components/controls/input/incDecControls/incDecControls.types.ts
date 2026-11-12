export interface IncDecControlsProps {
  readonly disableIncrement: boolean;
  readonly disableDecrement: boolean;
  readonly onIncDec: (isInc: boolean, event: React.MouseEvent<SVGElement> | React.PointerEvent<SVGElement> | React.KeyboardEvent<SVGElement>) => void;
}
