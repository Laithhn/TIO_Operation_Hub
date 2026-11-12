export interface ResizeHandleProps {
  readonly placement: 'lefttop' | 'top' | 'righttop' | 'right' | 'rightbottom' | 'bottom' | 'leftbottom' | 'left';
  readonly onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
}
