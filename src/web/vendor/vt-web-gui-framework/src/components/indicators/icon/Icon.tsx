import { useImperativeHandle, useRef } from 'react';

import { getTypoColorClass, type TypoColorKeys } from 'assets/styles';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';
import { isNumber } from 'utils/type';

import { getIconPath, iconExists, viewbox } from 'VtWebGuiIcons/src';

import * as css from './icon.scss';
import { type IconProps, iconSize, iconStylingProps } from './icon.types';


/**
 * React component of the indicator component "Icon" to display a symbol for dashboard contents of
 * VtWebGuiFramework.
 */
const Icon = ({
  ref, icon = '', size = 'normal', color, rotation = 0, disable = false,
  ...restProps
}: IconProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const iconElemRef = useRef<HTMLSpanElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, iconStylingProps);

  const sizeAsNum = isNumber(size, { withoutInfinite: true }) ? size : iconSize[size];
  const sizeAsPxStr = `${sizeAsNum}px`;
  // The colour the icon is drawn in; its class resolves it for the ground the icon sits on.
  let colorKey: TypoColorKeys = color ?? 'normal';

  if (disable) {
    colorKey = 'extraWeak';
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
    clientLeft: iconElemRef.current?.clientLeft,
    clientWidth: iconElemRef.current?.clientWidth,
    clientTop: iconElemRef.current?.clientTop,
    clientHeight: iconElemRef.current?.clientHeight,
    getBoundingClientRect: () => iconElemRef.current?.getBoundingClientRect(),
  }), []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!iconExists(icon) || !sizeAsNum) {
    return null;
  }


  const svgStyle = rotation
    ? { transform: `rotate(${rotation}deg)` }
    : {};

  const hiddenTextStyle = {
    width: `${sizeAsNum / 2}px`,
    marginLeft: `${-sizeAsNum / 2}px`,
    lineHeight: sizeAsPxStr,
  };

  return (
    <span ref={iconElemRef} className={classNames(css.icon, getTypoColorClass(css, colorKey))} style={outerElemStyle}>
      <svg width={sizeAsPxStr} height={sizeAsPxStr} viewBox={viewbox} style={svgStyle}>
        <path d={getIconPath(icon)} />
      </svg>
      <span style={hiddenTextStyle}>&nbsp;</span>
    </span>
  );
  //                                                                                  </editor-fold>
};

Icon.displayName = 'Icon';


export { Icon };
