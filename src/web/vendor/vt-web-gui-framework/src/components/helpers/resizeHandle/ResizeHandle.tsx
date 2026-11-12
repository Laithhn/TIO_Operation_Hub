import { layout } from 'assets/styles';

import * as css from './resizeHandle.scss';
import type { ResizeHandleProps } from './resizeHandle.types';


const pos = layout.resizableSnapDim;
const dim = 2 * layout.resizableSnapDim;

const resizeHandleStyle = {
  lefttop: {
    left: `${-pos}px`,
    width: `${dim}px`,
    top: `${-pos}px`,
    height: `${dim}px`,
    cursor: 'nw-resize',
  },
  top: {
    left: 0,
    width: '100%',
    top: `${-pos}px`,
    height: `${dim}px`,
    cursor: 'n-resize',
  },
  righttop: {
    left: `calc(100% - ${pos}px)`,
    width: `${dim}px`,
    top: `${-pos}px`,
    height: `${dim}px`,
    cursor: 'ne-resize',
  },
  right: {
    left: `calc(100% - ${pos}px)`,
    width: `${dim}px`,
    top: 0,
    height: '100%',
    cursor: 'e-resize',
  },
  rightbottom: {
    left: `calc(100% - ${pos}px)`,
    width: `${dim}px`,
    top: `calc(100% - ${pos}px)`,
    height: `${dim}px`,
    cursor: 'se-resize',
  },
  bottom: {
    left: 0,
    width: '100%',
    top: `calc(100% - ${pos}px)`,
    height: `${dim}px`,
    cursor: 's-resize',
  },
  leftbottom: {
    left: `${-pos}px`,
    width: `${dim}px`,
    top: `calc(100% - ${pos}px)`,
    height: `${dim}px`,
    cursor: 'sw-resize',
  },
  left: {
    left: `${-pos}px`,
    width: `${dim}px`,
    top: 0,
    height: '100%',
    cursor: 'w-resize',
  },
};


/**
 * React component of the helper component "ResizeHandle".
 */
const ResizeHandle = ({ placement, onPointerDown }: ResizeHandleProps) => (
  <div
    className={css.resizeHandle}
    style={resizeHandleStyle[placement]}
    onPointerDown={onPointerDown}
  />
);

ResizeHandle.displayName = 'ResizeHandle';


export { ResizeHandle };
