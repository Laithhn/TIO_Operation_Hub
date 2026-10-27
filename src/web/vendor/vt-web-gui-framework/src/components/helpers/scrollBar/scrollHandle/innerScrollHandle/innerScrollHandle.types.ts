import type { ScrollBarStatus } from '../../scrollBar.types';


export interface InnerScrollHandleProps {
  readonly vertical: boolean;
  readonly status: ScrollBarStatus;
}
