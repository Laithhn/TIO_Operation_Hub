import type { ButtonProps } from 'components/controls/button';

import type { TabKeyEventHandler } from '../calendar.type';


export interface NowButtonHandle {
  focus: () => void;
  handleTabKeyEvent: TabKeyEventHandler;
}


export interface NowButtonProps {
  readonly ref: React.RefObject<NowButtonHandle | null>;
  readonly showDate: boolean;
  readonly showTime: boolean;
  readonly onClick: NonNullable<ButtonProps['onClick']>;
  readonly onFocusPrev?: () => void;
  readonly onFocusNext?: () => void;
}
