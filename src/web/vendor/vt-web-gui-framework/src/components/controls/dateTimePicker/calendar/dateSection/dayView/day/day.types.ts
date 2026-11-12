import type { SelectedDay } from '../../../calendar.type';


export interface DayHandle {
  focus: () => void;
}


export interface DayProps {
  readonly ref?: React.Ref<DayHandle | null>;
  readonly dayNum: number;
  readonly isOtherMonth: boolean;
  readonly isToday: boolean;
  readonly selected: SelectedDay;
  readonly dayWidth: number;
  readonly onSelect: ({ dayNum, isOtherMonth }: { dayNum: number; isOtherMonth: boolean }) => void;
  readonly onMoveSelected: ({ dayNum, startMoving }: { dayNum: number; startMoving: boolean }) => void;
  readonly onTabKey: ({ event }: { event: React.KeyboardEvent<HTMLSpanElement> }) => void;
  readonly onArrowKey: ({ dayNum, pos, event }: { dayNum: number; pos: 'left' | 'right' | 'up' | 'down'; event: React.KeyboardEvent<HTMLSpanElement> }) => void;
}
