import PropTypes from 'prop-types';
import {
  memo, forwardRef, useRef, useImperativeHandle, useCallback,
} from 'react';

import Enums from 'assets/enums';
import useInteractions from 'components/hooks/useInteractions';
import useStylingProps from 'components/hooks/useStylingProps';
import classNames from 'utils/classNames';

import Icon from './icon';
import Text from './text';
import css from './checkBox.scss';
import { CheckBoxState, CheckBoxType } from './enums';
import stylingProps from './stylingProps';


const keysForClick = [' '];
const TICKBOX_MIXED = 'TICKBOX_MIXED';


/**
 * Memoized React component of a check box which can be used everywhere in VtWebGuiFramework, placed
 * inline with CSS grid.
 */
const CheckBox = memo(forwardRef(({
  id, htmlId, type, large, state, darkTheme, text, textType, textFirst, textWrap, value, onClick,
  ...restProps
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const checkBoxRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, stylingProps);

  const disabled = (state === CheckBoxState.DISABLED);
  const withoutText = (text === '');
  let iconState, ariaChecked;

  if (type === CheckBoxType.RADIO_BUTTON) {
    if (value === true) {
      iconState = 'CHECKED';
      ariaChecked = 'true';
    } else {
      iconState = 'UNCHECKED';
      ariaChecked = 'false';
    }
  } else if (value === true) {
    iconState = 'CHECKED';
    ariaChecked = 'true';
  } else if (value === TICKBOX_MIXED) {
    iconState = 'MIXED';
    ariaChecked = 'mixed';
  } else {
    iconState = 'UNCHECKED';
    ariaChecked = 'false';
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    focus: () => {
      requestAnimationFrame(() => {
        checkBoxRef.current.focus();
      });
    },
    blur: () => {
      requestAnimationFrame(() => {
        checkBoxRef.current.blur();
      });
    },
  }), []);


  const { interactionProps, focus, hover } = useInteractions({
    enableClick: true,
    enableKeys: true,
    enableFocus: true,
    disabled,
    keysForClick,
    tabIndex: 0,
    onClick: useCallback((event) => { onClick(id, event); }, [id, onClick]),
    onKey: useCallback((event) => {
      if (event.key === 'Escape') {
        document.activeElement?.blur();
      }
    }, []),
  });


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const checkBoxClasses = classNames(css.checkBox, {
    [css.disabled]: disabled,
  });

  return (
    <span
      {...((process.env.NODE_ENV === 'development') && { id: htmlId })}
      ref={checkBoxRef}
      role="checkbox"
      aria-checked={ariaChecked}
      className={checkBoxClasses}
      style={outerElemStyle}
      data-id={id}
      {...interactionProps}
    >
      {Icon({
        type,
        large,
        state,
        darkTheme,
        textFirst,
        withoutText,
        iconState,
        focus: (focus || hover),
      })}
      {!withoutText && (
        <Text disabled={disabled} darkTheme={darkTheme} textType={textType} textWrap={textWrap}>
          {text}
        </Text>
      )}
    </span>
  );
  //                                                                                  </editor-fold>
}));

CheckBox.displayName = 'CheckBox';

CheckBox.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  htmlId: PropTypes.string,
  type: PropTypes.instanceOf(CheckBoxType),
  large: PropTypes.bool,
  state: PropTypes.instanceOf(CheckBoxState),
  darkTheme: PropTypes.bool,
  text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  textType: PropTypes.instanceOf(Enums.TextType),
  textFirst: PropTypes.bool,
  textWrap: PropTypes.bool,
  value: PropTypes.oneOf([false, true, TICKBOX_MIXED]),
  onClick: PropTypes.func,
};

CheckBox.defaultProps = {
  id: '',
  htmlId: null,
  type: CheckBoxType.TICK_BOX,
  large: false,
  state: CheckBoxState.IDLE,
  darkTheme: false,
  text: '',
  textType: Enums.TextType.VALUE,
  textFirst: false,
  textWrap: false,
  value: false,
  onClick() {},
};

export { CheckBoxType, CheckBoxState, TICKBOX_MIXED };
export default CheckBox;
