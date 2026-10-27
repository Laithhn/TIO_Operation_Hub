import PropTypes from 'prop-types';

import classNames from 'utils/classNames';

import defines from '../defines';
import { CheckBoxState, CheckBoxType } from '../enums';
import css from './icon.scss';


const icons = {
  viewbox: '0 0 18 18',
  tickBox: {
    UNCHECKED: [
      'M0 0v18h18V0Z',
      'M2 2v14h14V2Z',
    ],
    CHECKED: [
      'M0 0v18h18V0Z',
      'M3.485 9.849c-.321-.321-.318-.956 0-1.273.314-.315.954-.319 1.272 0l2.475 2.475 6.01-6.01c.32-.32.957-.317 1.273 0 .318.317.319.954 0 1.272L7.87 12.96c-.317.316-.953.32-1.273 0-1.128-1.155-2.135-2.128-3.111-3.111Z',
    ],
    MIXED: [
      'M0 0v18h18V0Z',
      'M4 8a1 1 0 1 0 0 2h10a1 1 0 1 0 0-2Z',
    ],
  },
  radioButton: {
    UNCHECKED: [
      'M0 9a9 9 0 0 0 18 0 9 9 0 0 0-18 0Z',
      'M2 9a7 7 0 0 0 14 0 7 7 0 0 0-14 0Z',
    ],
    CHECKED: [
      'M0 9a9 9 0 0 0 18 0 9 9 0 0 0-18 0Z',
      'M2 9a7 7 0 0 0 14 0 7 7 0 0 0-14 0Zm3 0a4 4 0 0 1 8 0 4 4 0 0 1-8 0Z',
    ],
  },
};


/**
 * Stateless React component of the icon of a check box.
 * Note, that if you call this component as a function, the default props are not considered!
 */
const Icon = ({
  type, large, state, darkTheme, textFirst, withoutText, iconState, focus,
}) => {
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const sizePx = `${large ? defines.iconSizeLarge : defines.iconSize}px`;
  let pathes;

  if (type === CheckBoxType.RADIO_BUTTON) {
    pathes = icons.radioButton[iconState];
  } else {
    pathes = icons.tickBox[iconState];
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

  const checkBoxIconClasses = classNames(css.icon, {
    [css.large]: large,
    [css.error]: (state === CheckBoxState.ERROR),
    [css.disabled]: (state === CheckBoxState.DISABLED),
    [css.darkTheme]: darkTheme,
    [css.textFirst]: textFirst,
    [css.withoutText]: withoutText,
    [css.focus]: focus,
  });

  return (
    <span className={checkBoxIconClasses}>
      <svg width={sizePx} height={sizePx} viewBox={icons.viewbox}>
        {pathes.map((path, idx) => (
          <path key={(idx === 0) ? 'background' : `foreground${idx}`} d={path} />
        ))}
      </svg>
      <span>&nbsp;</span>
    </span>
  );
  //                                                                                  </editor-fold>
};

Icon.displayName = 'Icon';

Icon.propTypes = {
  type: PropTypes.instanceOf(CheckBoxType),
  large: PropTypes.bool,
  state: PropTypes.instanceOf(CheckBoxState),
  darkTheme: PropTypes.bool,
  textFirst: PropTypes.bool,
  withoutText: PropTypes.bool,
  iconState: PropTypes.oneOf(['UNCHECKED', 'CHECKED', 'MIXED']),
  focus: PropTypes.bool,
};

Icon.defaultProps = {
  type: CheckBoxType.TICK_BOX,
  large: false,
  state: CheckBoxState.IDLE,
  darkTheme: false,
  textFirst: false,
  withoutText: false,
  iconState: 'UNCHECKED',
  focus: false,
};

export default Icon;
