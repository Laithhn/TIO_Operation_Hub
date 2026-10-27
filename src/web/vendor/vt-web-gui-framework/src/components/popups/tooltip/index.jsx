import { memo } from 'react';
import { createPortal } from 'react-dom';

import * as css from './tooltip.scss';


//Tooltip.propTypes = {
//  text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
//};

/**
 * Memoized React component of a tooltip.
 */
const Tooltip = memo(({ text = '' }) => createPortal(
  <div className={css.tooltip}>
    {text}
  </div>,
  document.getElementById(process.env.ELEM_ID_TEMP),
));

Tooltip.displayName = 'Tooltip';

export default Tooltip;
