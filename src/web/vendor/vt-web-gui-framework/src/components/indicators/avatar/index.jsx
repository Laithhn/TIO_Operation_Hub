import PropTypes from 'prop-types';
import { memo, useMemo } from 'react';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import useStylingProps from 'components/hooks/useStylingProps';
import classNames from 'utils/classNames';

import css from './avatar.scss';
import stylingProps from './stylingProps';


const defaultDim = 40;
const defaultPlaceholderIcon = 'USERNEUTRAL';


/**
 * Helper function to calculate the dimension (width and height) by the diameter of a round icon.
 * The mathematical formula for this dimension is: dim = diameter / sqrt(2). In this case a factor
 * of 0.85 is add to ensure a gap between icon and border. So the resulting factor of 0.85 / sqrt(2)
 * is 0.601.
 *
 * @param {number} diameter - The diameter of the icon in pixels.
 * @returns {number}
 */
const calcIconDimByDiameter = (diameter) => Math.round(diameter * 0.601);


/**
 * Memoized React component of a round picture image (avatar) with a default diameter of 40 pixels.
 * If the source of the picture (src for <img> element) is not given, an alternative placeholder
 * icon is shown.
 */
const Avatar = memo(({
  src, dim, darkTheme, active, placeholderIcon, ...restProps
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, stylingProps);
  const { viewbox, iconExists, getIconPath } = useIconsAsync();
  const sizeAsPxStr = `${calcIconDimByDiameter(dim)}px`;

  const avatarStyle = useMemo(() => ({
    ...outerElemStyle,
    width: `${dim}px`,
    height: `${dim}px`,
    borderRadius: `${dim / 2}px`,
  }), [dim, outerElemStyle]);


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

  const avatarClasses = classNames(css.avatar, {
    [css.placeholder]: !src,
    [css.darkTheme]: darkTheme,
    [css.active]: active,
  });

  return (
    <div className={avatarClasses} style={avatarStyle}>
      {src ? (
        <img src={src} alt="" />
      ) : (
        <svg width={sizeAsPxStr} height={sizeAsPxStr} viewBox={viewbox}>
          <path d={getIconPath(iconExists(placeholderIcon) ? placeholderIcon : defaultPlaceholderIcon)} />
        </svg>
      )}
    </div>
  );
  //                                                                                  </editor-fold>
});

Avatar.displayName = 'Avatar';

Avatar.propTypes = {
  src: PropTypes.string,
  dim: PropTypes.number,
  darkTheme: PropTypes.bool,
  active: PropTypes.bool,
  placeholderIcon: PropTypes.string,
};

Avatar.defaultProps = {
  src: '',
  dim: defaultDim,
  darkTheme: false,
  active: false,
  placeholderIcon: defaultPlaceholderIcon,
};

export default Avatar;
