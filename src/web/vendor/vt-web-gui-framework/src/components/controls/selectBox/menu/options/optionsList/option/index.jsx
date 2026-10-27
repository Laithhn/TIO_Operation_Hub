import PropTypes from 'prop-types';

import classNames from 'utils/classNames';

import css from './option.scss';


/**
 * Stateless React component of an option item in the menu of the select box.
 * Note, that if you call this component as a function, the default props are not considered!
 */
const Option = ({
  key, value, text, disabled, italic, onClick,
}) => {
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let modText = '\u{a0}';

  if (((typeof text === 'string') && (text !== '')) || (typeof text === 'number')) {
    modText = text;
  } else if (((typeof value === 'string') && (value !== '')) || (typeof value === 'number')) {
    modText = value;
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for synthetic React event "onClick" to delegate click events of this option to the
   * parent component, returning the* value of this option.
   */
  const handleClick = (event) => {
    event.stopPropagation();

    if (!disabled) {
      onClick(value, event);
    }
  };


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const optionClasses = classNames(css.option, {
    [css.typoDisabled]: disabled,
    [css.italic]: italic,
  });

  return (
    <div // eslint-disable-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
      key={key}
      className={optionClasses}
      onClick={handleClick}
    >
      {modText}
    </div>
  );
  //                                                                                  </editor-fold>
};

Option.displayName = 'Option';

Option.propTypes = {
  key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  disabled: PropTypes.bool,
  italic: PropTypes.bool,
  onClick: PropTypes.func,
};

Option.defaultProps = {
  text: '',
  disabled: false,
  italic: false,
  onClick() {},
};

export default Option;
