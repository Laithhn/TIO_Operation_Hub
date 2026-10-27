import { Enumify } from 'enumify'; // eslint-disable-line max-classes-per-file
import PropTypes from 'prop-types';
import { memo } from 'react';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import useStylingProps from 'components/hooks/useStylingProps';

import css from './icon.scss';
import stylingProps from './stylingProps';


/**
 * @typedef {object} IconSizeValue
 * @property {number} value - The icon size in pixels.
 * @property {string} valuePx - The icon size as string with trailing "px".
 * @property {string} enumKey - The enumeration key as string.
 * @property {number} enumOrdinal - The zero based enumeration number.
 */

/**
 * Enumeration for the available sizes of the icon.
 *
 * @property {IconSizeValue} SMALL - 16 pixel
 * @property {IconSizeValue} NORMAL - 20 pixel
 * @property {IconSizeValue} LARGE - 24 pixel
 * @property {IconSizeValue} XL - 32 pixel
 * @property {string[]} enumKeys - Array with all enumeration keys as strings.
 * @property {IconSizeValue[]} enumValues - Array with all enumeration values.
 * @property {(enumKey: string) => IconSizeValue|undefined} enumValueOf - Function that returns the
 *   enumeration value of a given enumeration key or undefined if not found.
 */
class IconSize extends Enumify {
  static SMALL = new IconSize({ value: 16 });
  static NORMAL = new IconSize({ value: 20 });
  static LARGE = new IconSize({ value: 24 });
  static XL = new IconSize({ value: 32 });
  static _ = this.closeEnum();

  constructor({ value }) {
    super();
    this.value = value;
    this.valuePx = `${value}px`;
  }
}


/**
 * Memoized React component of an icon for dashboard contents of VtWebGuiFramework.
 */
const Icon = memo(({
  icon, size, color, darkTheme, disabled, ...restProps
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { viewbox, iconExists, getIconPath } = useIconsAsync();
  const { outerElemStyle } = useStylingProps(restProps, stylingProps);

  const sizeAsNum = (size instanceof IconSize) ? size.value : size;
  const sizeAsPxStr = (size instanceof IconSize) ? size.valuePx : `${size}px`;
  let fill;

  if (disabled) {
    fill = darkTheme ? defines.typo.color.light.extraWeak : defines.typo.color.dark.extraWeak;
  } else if (color === Enums.ValueColor.NONE) {
    fill = darkTheme ? defines.typo.color.light.normal : defines.typo.color.dark.normal;
  } else {
    fill = darkTheme ? color.darkThemeColor : color.color;
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
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!iconExists(icon)) {
    return null;
  }

  const iconStyle = {
    ...outerElemStyle,
    fill,
  };

  const hiddenTextStyle = {
    width: `${sizeAsNum / 2}px`,
    marginLeft: `${-sizeAsNum / 2}px`,
    lineHeight: sizeAsPxStr,
  };

  return (
    <span className={css.icon} style={iconStyle}>
      <svg width={sizeAsPxStr} height={sizeAsPxStr} viewBox={viewbox}>
        <path d={getIconPath(icon)} />
      </svg>
      <span style={hiddenTextStyle}>&nbsp;</span>
    </span>
  );
  //                                                                                  </editor-fold>
});

Icon.displayName = 'Icon';

Icon.propTypes = {
  icon: PropTypes.string,
  size: PropTypes.oneOfType([PropTypes.number, PropTypes.instanceOf(IconSize)]),
  color: PropTypes.instanceOf(Enums.ValueColor),
  darkTheme: PropTypes.bool,
  disabled: PropTypes.bool,
};

Icon.defaultProps = {
  icon: '',
  size: IconSize.NORMAL,
  color: Enums.ValueColor.NONE,
  darkTheme: false,
  disabled: false,
};

export { IconSize };
export default Icon;
