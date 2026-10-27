import type { SelectedDay } from '../../../../calendar.type';


export interface SelectedMarkerProps {
  readonly selected: SelectedDay;
  readonly dayWidth: number;
  readonly isRtl: boolean;
}
