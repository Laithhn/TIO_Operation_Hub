import PropTypes from 'prop-types';

import OptionsList from './optionsList';
import css from './options.scss';


/**
 * Stateless React component of the container in the menu of the select box, that contains the list
 * with the single option items (OptionsList). This component is not memoized because its props
 * (especially "top") change too frequently.
 * Note, that if you call this component as a function, the default props are not considered!
 */
const Options = ({ top, options, onSelectOption }) => (
  <div
    className={css.options}
    style={{ transform: `translateY(${top ?? 0}px)` }}
  >
    <OptionsList
      options={options}
      onSelectOption={onSelectOption}
    />
  </div>
);

Options.displayName = 'Options';

Options.propTypes = {
  top: PropTypes.number,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    disabled: PropTypes.bool,
    italic: PropTypes.bool,
  })),
  onSelectOption: PropTypes.func,
};

Options.defaultProps = {
  top: 0,
  options: [],
  onSelectOption() {},
};

export default Options;
