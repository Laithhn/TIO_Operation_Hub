import PropTypes from 'prop-types';
import { memo } from 'react';

import classNames from 'utils/classNames';

import css from './seperator.scss';


/**
 * Memoized React component of the seperator for the single parts of the date and time picker
 * control element.
 */
const Seperator = memo(({ dense, value }) => ((value === '\t')
  ? <span className={classNames(css.spacer, { [css.dense]: dense })} />
  : <span className={css.seperator}>{value}</span>
));

Seperator.displayName = 'Seperator';

Seperator.propTypes = {
  dense: PropTypes.bool,
  value: PropTypes.string,
};

Seperator.defaultProps = {
  dense: false,
  value: '',
};

export default Seperator;
