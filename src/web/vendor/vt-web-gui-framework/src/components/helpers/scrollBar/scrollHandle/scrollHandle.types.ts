import type { ScrollBarDir, ScrollBarStatus } from '../scrollBar.types';


export interface ScrollHandleProps {
  readonly dir: ScrollBarDir;
  readonly dim: number;
  readonly pos: number;
  readonly handleOutside: boolean;
  readonly smoothScrolling: boolean;
  readonly status: ScrollBarStatus;
  readonly onPointerDown: React.PointerEventHandler<HTMLDivElement>;
  readonly onPointerEnter: React.PointerEventHandler<HTMLDivElement>;
  readonly onPointerLeave: React.PointerEventHandler<HTMLDivElement>;
}
