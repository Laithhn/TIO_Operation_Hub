import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';

import { getIconPath, iconExists, viewbox } from 'VtWebGuiIcons/src';

import * as css from './avatar.scss';
import { type AvatarProps, avatarStylingProps } from './avatar.types';


const defaultDim = 40;
const defaultPlaceholderIcon = 'USERNEUTRAL';


/**
 * Helper function to calculate the dimension (width and height) by the diameter of a round icon.
 * The mathematical formula for this dimension is: dim = diameter / sqrt(2). In this case a factor
 * of 0.85 is add to ensure a gap between icon and border. So the resulting factor of 0.85 / sqrt(2)
 * is 0.601.
 *
 * @param diameter - The diameter of the icon in pixels.
 */
const calcIconDimByDiameter = (diameter: number): number => Math.round(diameter * 0.601);


/**
 * React component of the indicator component "Avatar" to display a round picture image
 * (avatar) with a default diameter of 40 pixels. If the source of the picture (src for <img>
 * element) is not given, an alternative placeholder icon is shown.
 */
const Avatar = ({
  src, dim = defaultDim, active = false,
  placeholderIcon = defaultPlaceholderIcon, ...restProps
}: AvatarProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, avatarStylingProps);

  const sizeAsPxStr = `${calcIconDimByDiameter(dim)}px`;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const getAvatarStyle = () => ({
    ...outerElemStyle,
    width: `${dim}px`,
    height: `${dim}px`,
    borderRadius: `${dim / 2}px`,
  });


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
    [css.active]: active,
  });

  return (
    <div className={avatarClasses} style={getAvatarStyle()}>
      {src
        ? (
          <img src={src} alt="" />
        )
        : null}
      {!src
        ? (
          <svg width={sizeAsPxStr} height={sizeAsPxStr} viewBox={viewbox}>
            <path d={getIconPath(iconExists(placeholderIcon) ? placeholderIcon : defaultPlaceholderIcon)} />
          </svg>
        )
        : null}
    </div>
  );
  //                                                                                  </editor-fold>
};

Avatar.displayName = 'Avatar';


export { Avatar };
