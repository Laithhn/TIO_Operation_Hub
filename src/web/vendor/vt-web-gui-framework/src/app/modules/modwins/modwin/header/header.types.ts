import type { WindowControlButtonProps } from 'app/modules/windowControlButton';


export interface HeaderProps {
  readonly title: string;
  readonly onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  readonly onMinimize?: NonNullable<WindowControlButtonProps['onClick']>;
  readonly onClose?: NonNullable<WindowControlButtonProps['onClick']>;
}
