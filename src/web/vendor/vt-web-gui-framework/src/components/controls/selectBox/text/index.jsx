import PropTypes from 'prop-types';

import classNames from 'utils/classNames';

import css from './text.scss';


/**
 * Stateless React component of the text of the selected option of the select box. It is not
 * memoized because prop "option" changes frequently.
 * Note, that if you call this component as a function, the default props are not considered!
 */
const Text = ({
  darkTheme, disabled, emptyHint, noSelection, areEnabledOptions, option,
}) => {
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let text;

  if (option) {
    if (((typeof option.text === 'string') && (option.text !== '')) || (typeof option.text === 'number')) {
      ({ text } = option);
    } else if (((typeof option.value === 'string') && (option.value !== '')) || (typeof option.value === 'number')) {
      text = option.value;
    } else {
      text = '\u{a0}';
    }
  } else if (areEnabledOptions) {
    text = (((typeof noSelection === 'string') && (noSelection !== '')) ? noSelection : '\u{a0}');
  } else {
    text = emptyHint || '\u{a0}';
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const textClasses = classNames(css.text, {
    [css.typoDarkTheme]: darkTheme,
    [css.typoDisabled]: disabled,
    [css.noOption]: !option,
    [css.italic]: option?.italic,
  });

  return (
    <span className={textClasses}>{text}</span>
  );
  //                                                                                  </editor-fold>
};

Text.displayName = 'Text';

Text.propTypes = {
  darkTheme: PropTypes.bool,
  disabled: PropTypes.bool,
  emptyHint: PropTypes.string,
  noSelection: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  areEnabledOptions: PropTypes.bool,
  option: PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    italic: PropTypes.bool,
  }),
};

Text.defaultProps = {
  darkTheme: false,
  disabled: false,
  emptyHint: '',
  noSelection: false,
  areEnabledOptions: false,
  option: null,
};

export default Text;
