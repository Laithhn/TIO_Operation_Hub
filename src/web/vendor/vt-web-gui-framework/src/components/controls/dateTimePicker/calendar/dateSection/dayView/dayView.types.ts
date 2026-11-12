import type { DayProps } from './day/day.types';


export interface DayViewHandle {
  focusTodayOrFirstDay: () => void;
  focusFirstDay: () => void;
  focusLastDay: () => void;
  focusDay: (dayNum: number) => boolean;
}


export interface DayViewProps {
  readonly ref: React.RefObject<DayViewHandle | null>;
  readonly year: number;
  readonly month: number;
  readonly firstSelectedDate: Date | null;
  readonly secondSelectedDate: Date | null;
  readonly onSelect: ({ dayNum, prevDayNum, monthOffset }: { dayNum: number; prevDayNum?: number; monthOffset: number }) => void;
  readonly onTabKey: DayProps['onTabKey'];
  readonly onArrowKey: DayProps['onArrowKey'];
}
