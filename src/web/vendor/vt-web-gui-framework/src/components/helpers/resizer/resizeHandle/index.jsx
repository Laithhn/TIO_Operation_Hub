import PropTypes from 'prop-types';
import { memo } from 'react';

import defines from 'assets/defines';

import css from './resizeHandle.scss';


const pos = defines.layout.resizableSnapDim;
const dim = 2 * defines.layout.resizableSnapDim;

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
 *
 */
const ResizeHandle = memo(({ placement, onPointerDown }) => (
  <div
    className={css.resizeHandle}
    style={resizeHandleStyle[placement]}
    onPointerDown={onPointerDown}
  />
));

ResizeHandle.displayName = 'ResizeHandle';

ResizeHandle.propTypes = {
  placement: PropTypes.oneOf(['lefttop', 'top', 'righttop', 'right', 'rightbottom', 'bottom', 'leftbottom', 'left']).isRequired,
  onPointerDown: PropTypes.func,
};

ResizeHandle.defaultProps = {
  onPointerDown() {},
};

export default ResizeHandle;
