import type { ScrollBarDir, ScrollBarStatus } from '../scrollBar.types';


export interface ScrollWayProps {
  readonly dir: ScrollBarDir;
  readonly isRtl: boolean;
  readonly posStart: number;
  readonly posEnd: number;
  readonly handleOutside: boolean;
  readonly status: ScrollBarStatus;
  readonly onPointerEnter: React.PointerEventHandler<HTMLDivElement>;
  readonly onPointerLeave: React.PointerEventHandler<HTMLDivElement>;
  readonly onPointerDownAtPos: ({ pos, event }: { pos: number; event: React.PointerEvent<HTMLDivElement> }) => void;
}
