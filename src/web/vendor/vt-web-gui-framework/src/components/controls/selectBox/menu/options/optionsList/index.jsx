import PropTypes from 'prop-types';
import { memo } from 'react';

import Option from './option';


/**
 * Memoized React component of the list in the menu of the select box, that contains the single
 * option items. This intermediate component between Options and Option is mainly used for
 * memoization, because its props do not change so often. The memoization of component Option can so
 * be omitted.
 */
const OptionsList = memo(({ options, onSelectOption }) => options.map(({
  value, text, disabled, italic,
}) => Option({
  key: value,
  value,
  text,
  disabled,
  italic,
  onClick: onSelectOption,
})));

OptionsList.displayName = 'OptionsList';

OptionsList.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    disabled: PropTypes.bool,
    italic: PropTypes.bool,
  })),
  onSelectOption: PropTypes.func,
};

OptionsList.defaultProps = {
  options: [],
  onSelectOption() {},
};

export default OptionsList;
