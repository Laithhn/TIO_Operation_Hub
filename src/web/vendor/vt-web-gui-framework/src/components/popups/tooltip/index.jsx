import PropTypes from 'prop-types';
import { memo } from 'react';
import { createPortal } from 'react-dom';

import css from './tooltip.scss';


/**
 * Memoized React component of a tooltip.
 */
const Tooltip = memo(({ text }) => createPortal(
  <div className={css.tooltip}>
    {text}
  </div>,
  document.getElementById(process.env.ELEM_ID_TEMP)
));

Tooltip.displayName = 'Tooltip';

Tooltip.propTypes = {
  text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

Tooltip.defaultProps = {
  text: '',
};

export default Tooltip;
