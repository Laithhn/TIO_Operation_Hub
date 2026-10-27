import PropTypes from 'prop-types';
import {
  memo, useMemo, useCallback,
} from 'react';

import Enums from 'assets/enums';
import defines from 'assets/defines';
import Spinner, { SpinnerType } from 'components/helpers/spinner';
import useInteractions from 'components/hooks/useInteractions';
import useStylingProps from 'components/hooks/useStylingProps';
import bbCode from 'utils/bbCode';
import classNames from 'utils/classNames';

import { ValueFieldState } from './enums';
import stylingProps from './stylingProps';
import css from './valueField.scss';


/**
 * Memoized React component to display a value at dashboard contents of VtWebGuiFramework.
 * Optionally, the value can be given a unit and / or a hint text. The font size of the value can be
 * adjusted. The display value element can be shown as disabled. The prop noWrap effects only the
 * value: if it is set to true, there is no line break for the value.
 */
const ValueField = memo(({
  id, darkTheme, title, titleAsLabel, value, unit, hint, state, valueSize, valueColor, noWrap,
  noOverflow, onClick, ...restProps
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { elemStyle, hasDarkBackground } = useStylingProps(restProps, stylingProps, { addCombinedStyle: true });

  const nextDarkTheme = (typeof darkTheme === 'boolean') ? darkTheme : hasDarkBackground;
  const clickable = (state === ValueFieldState.IDLE) && onClick;

  const {
    titleClasses, valueClasses, unitClasses, hintClasses,
  } = useMemo(() => ({
    titleClasses: classNames(css.title, {
      [css.titleAsLabel]: titleAsLabel,
      [css.typoDarkTheme]: nextDarkTheme,
      [css.typoNoWrap]: noWrap,
      [css.typoNoOverflow]: noOverflow,
    }),
    valueClasses: classNames(css.value, {
      [css.typoValueLarge]: (valueSize === Enums.ValueSize.LARGE),
      [css.typoValueXL]: (valueSize === Enums.ValueSize.XL),
      [css.typoValueXXL]: (valueSize === Enums.ValueSize.XXL),
      [css.typoDarkTheme]: nextDarkTheme,
      [css.typoDisabled]: (state === ValueFieldState.DISABLED),
      [css.typoNoWrap]: noWrap,
      [css.typoNoOverflow]: noOverflow,
    }),
    unitClasses: classNames(css.unit, {
      [css.typoValueSmall]: ![Enums.ValueSize.XL, Enums.ValueSize.XXL].includes(valueSize),
      [css.typoValueLarge]: (valueSize === Enums.ValueSize.XXL),
      [css.typoDarkTheme]: nextDarkTheme,
      [css.typoDisabled]: (state === ValueFieldState.DISABLED),
    }),
    hintClasses: classNames(css.hint, {
      [css.typoValueSmall]: ![Enums.ValueSize.XL, Enums.ValueSize.XXL].includes(valueSize),
      [css.typoDarkTheme]: nextDarkTheme,
      [css.typoDisabled]: (state === ValueFieldState.DISABLED),
      [css.typoNoWrap]: noWrap,
      [css.typoNoOverflow]: noOverflow,
    }),
  }), [titleAsLabel, valueSize, state, noWrap, noOverflow, nextDarkTheme]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const { interactionProps, runClickAnim } = useInteractions({
    enableClick: true,
    enableKeys: true,
    disabled: !clickable,
    tabIndex: 0,
    onClick: useCallback((event) => onClick(id, event), [id, onClick]),
  });


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (state === ValueFieldState.LOADING) {
    return (
      <div className={css.valueField} style={elemStyle}>
        {title && <span className={titleClasses}>{title}</span>}
        <Spinner
          placeSelf={Enums.PlaceSelfItems.CENTER}
          type={SpinnerType.BARS}
          dim={defines.space.medium}
          darkTheme={nextDarkTheme}
        />
      </div>
    );
  }


  const valueFieldClasses = classNames(css.valueField, {
    [css.clickable]: clickable,
    [css.clicked]: runClickAnim,
  });

  const valueAndUnitStyle = {
    ...(((state === ValueFieldState.IDLE) && (valueColor !== Enums.ValueColor.NONE))
      ? { color: valueColor.color }
      : {}),
  };

  return (
    <div
      className={valueFieldClasses}
      style={elemStyle}
      {...(clickable && {
        role: 'button',
      })}
      {...interactionProps}
    >
      {title && <span className={titleClasses}>{title}</span>}
      <span className={css.valueContr}>
        <span className={valueClasses} style={valueAndUnitStyle}>{value}</span>
        {unit && <span className={unitClasses} style={valueAndUnitStyle}>{unit}</span>}
      </span>
      {hint && <span className={hintClasses}>{bbCode(hint)}</span>}
    </div>
  );
  //                                                                                  </editor-fold>
});

ValueField.displayName = 'ValueField';

ValueField.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  darkTheme: PropTypes.bool,
  title: PropTypes.string,
  titleAsLabel: PropTypes.bool,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  unit: PropTypes.string,
  hint: PropTypes.string,
  state: PropTypes.instanceOf(ValueFieldState),
  valueSize: PropTypes.instanceOf(Enums.ValueSize),
  valueColor: PropTypes.instanceOf(Enums.ValueColor),
  noWrap: PropTypes.bool,
  noOverflow: PropTypes.bool,
  onClick: PropTypes.func,
};

ValueField.defaultProps = {
  id: '',
  darkTheme: null,
  title: '',
  titleAsLabel: false,
  value: '',
  unit: '',
  hint: '',
  state: ValueFieldState.IDLE,
  valueSize: Enums.ValueSize.NORMAL,
  valueColor: Enums.ValueColor.NONE,
  noWrap: false,
  noOverflow: false,
  onClick: null,
};

export { ValueFieldState };
export default ValueField;
