import PropTypes from 'prop-types';
import { memo, useMemo } from 'react';

import Enums from 'assets/enums';
import useStylingProps from 'components/hooks/useStylingProps';
import classNames from 'utils/classNames';

import stylingProps from './stylingProps';
import css from './text.scss';


/**
 * Memorized React component to display a simple text in dashboard contents of VtWebGuiFramework.
 * Note that it is only memoized, if the given children is a string or number, but you can also use
 * <br /> and <Link> and so on.
 */
const Text = memo(({
  type, size, color, monotype, darkTheme, disabled, noWrap, noOverflow, children, ...restProps
}) => {
  const { elemStyle } = useStylingProps(restProps, stylingProps, { addCombinedStyle: true });

  const isValue = (type === Enums.TextType.VALUE);

  const textClasses = classNames({
    [css.monotype]: (isValue && monotype),
    [css.typoSetHeadline]: (type === Enums.TextType.HEADLINE),
    [css.typoSetTitle]: (type === Enums.TextType.TITLE),
    [css.typoSetLabel]: (type === Enums.TextType.LABEL),
    [css.typoSetHint]: (type === Enums.TextType.HINT),
    ...(isValue ? {
      [css.typoSetValue]: true,
      [css.typoValueSmall]: ![Enums.ValueSize.NORMAL, Enums.ValueSize.LARGE, Enums.ValueSize.XL, Enums.ValueSize.XXL].includes(size),
      [css.typoValueLarge]: (size === Enums.ValueSize.LARGE),
      [css.typoValueXL]: (size === Enums.ValueSize.XL),
      [css.typoValueXXL]: (size === Enums.ValueSize.XXL),
    } : {}),
    [css.typoDarkTheme]: darkTheme,
    [css.typoDisabled]: disabled,
    [css.typoNoWrap]: noWrap,
    [css.typoNoOverflow]: noOverflow,
  });

  const textStyle = useMemo(() => ({
    ...elemStyle,
    ...((isValue && !disabled && (color !== Enums.ValueColor.NONE)) ? { color: color.color } : {}),
  }), [color, disabled, elemStyle, isValue]);

  return (
    <span className={textClasses} style={textStyle}>
      {children}
    </span>
  );
});

Text.displayName = 'Text';

Text.propTypes = {
  type: PropTypes.instanceOf(Enums.TextType),
  size: PropTypes.instanceOf(Enums.ValueSize),
  color: PropTypes.instanceOf(Enums.ValueColor),
  monotype: PropTypes.bool,
  darkTheme: PropTypes.bool,
  disabled: PropTypes.bool,
  noWrap: PropTypes.bool,
  noOverflow: PropTypes.bool,
  children: PropTypes.node,
};

Text.defaultProps = {
  type: Enums.TextType.VALUE,
  size: Enums.ValueSize.SMALL,
  color: Enums.ValueColor.NONE,
  monotype: false,
  darkTheme: false,
  disabled: false,
  noWrap: false,
  noOverflow: false,
  children: null,
};

export default Text;
