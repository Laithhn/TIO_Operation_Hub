import { Enumify } from 'enumify';
import PropTypes from 'prop-types';
import { memo } from 'react';

import Enums from 'assets/enums';
import useStylingProps from 'components/hooks/useStylingProps';
import { hooks } from 'store';
import classNames from 'utils/classNames';

import css from './statusMarker.scss';
import stylingProps from './stylingProps';


/**
 * Enum for the available default sizes of the icon.
 *
 * @property {object} SMALL - 24 pixel
 * @property {object} NORMAL - 32 pixel
 * @property {object} LARGE - 50 pixel
 * @property {function} enumValues - Return an array with all enum objects.
 */
class StatusMarkerSize extends Enumify {
  static SMALL = new StatusMarkerSize({ value: 24 });
  static NORMAL = new StatusMarkerSize({ value: 32 });
  static LARGE = new StatusMarkerSize({ value: 50 });
  static _ = this.closeEnum();

  constructor({ value }) {
    super();
    this.value = value;
    this.valuePx = `${value}px`;
  }
}


const iconPathBackground = 'M11.998 24a1 1 0 01-1-1c0-2.297-2.59-7.159-5.013-11.037C5.032 10.719 4.5 9.149 4.5 7.5 4.5 3.364 7.864 0 12 0s7.5 3.364 7.5 7.5a7.426 7.426 0 01-1.54 4.542c-2.371 3.801-4.962 8.662-4.962 10.958a1 1 0 01-1 1z';
const iconPathOk = 'M16.847 4.38a.749.749 0 00-1.06.043L10.652 9.99 8.19 7.56a.75.75 0 10-1.053 1.068l2.993 2.95c.007.007.016.009.022.016.007.007.01.016.017.024a.748.748 0 001.06-.043l5.661-6.136a.75.75 0 00-.042-1.06z';
const iconPathWarning = 'M12.766 4.175a.752.752 0 00-.75-.75.752.752 0 00-.75.75v5.25c0 .412.337.75.75.75.412 0 .75-.338.75-.75zm.12 7.514a.886.886 0 10-1.772.002.886.886 0 001.772-.002z';
const iconPathError = 'M13.06 8l2.47-2.47a.75.75 0 10-1.06-1.06L12 6.94 9.53 4.47a.75.75 0 10-1.06 1.06L10.94 8l-2.47 2.47a.75.75 0 101.06 1.06L12 9.06l2.47 2.47a.748.748 0 001.06 0 .75.75 0 000-1.06z';
const iconPathUnknown = 'M13.66 8.083c-.883.421-.969.518-1.06.827 0 0-.046.642-.75.642-.473 0-.703-.279-.704-.628-.03-.523.235-1.177 1.422-1.723.526-.241.683-.41.683-.788 0-.484-.357-.767-1.25-.767-.798 0-1.1.216-1.529.613 0 0-.551.431-.98 0-.398-.399-.139-.796.014-.994.536-.659 1.264-1.058 2.493-1.058 1.607 0 2.72.683 2.72 2.143.001.977-.556 1.492-1.06 1.733zm-1.85 3.709a.906.906 0 01-.893-.892c0-.485.41-.893.893-.893.485 0 .893.41.893.892a.905.905 0 01-.893.893z';


/**
 * Memoized React component of a status marker.
 */
const StatusMarker = memo(({
  status, inactive, size, rotation, ...restProps
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = hooks.useI18n();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, stylingProps);
  const sizeAsNum = (size instanceof StatusMarkerSize) ? size.value : size;
  const sizeAsPxStr = (size instanceof StatusMarkerSize) ? size.valuePx : `${size}px`;

  let iconPathSymbol;

  switch (status) {
    case Enums.SystemState.OK: iconPathSymbol = iconPathOk; break;
    case Enums.SystemState.WARNING: iconPathSymbol = iconPathWarning; break;
    case Enums.SystemState.ERROR: iconPathSymbol = iconPathError; break;
    default: iconPathSymbol = iconPathUnknown; break;
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

  const statusMarkerClasses = classNames(css.statusMarker, {
    ...(inactive ? {
      [css.inactive]: inactive,
    } : {
      [css.ok]: (status === Enums.SystemState.OK),
      [css.warning]: (status === Enums.SystemState.WARNING),
      [css.error]: (status === Enums.SystemState.ERROR),
      [css.unknown]: ![Enums.SystemState.OK, Enums.SystemState.WARNING, Enums.SystemState.ERROR].includes(status),
    }),
  });

  const svgStyle = {
    transform: `rotate(${rotation * (isRtl ? -1 : 1)}deg)`,
  };

  const symbolStyle = {
    transform: `rotate(${rotation * (isRtl ? 1 : -1)}deg)`,
  };

  const hiddenTextStyle = {
    width: `${sizeAsNum / 2}px`,
    marginLeft: `${-sizeAsNum / 2}px`,
    lineHeight: sizeAsPxStr,
  };

  return (
    <span className={statusMarkerClasses} style={outerElemStyle}>
      <svg
        style={svgStyle}
        width={sizeAsPxStr}
        height={sizeAsPxStr}
        viewBox="0 0 24 24"
      >
        <path className={css.background} d={iconPathBackground} />
        <path className={css.symbol} style={symbolStyle} d={iconPathSymbol} />
      </svg>
      <span style={hiddenTextStyle}>&nbsp;</span>
    </span>
  );
  //                                                                                  </editor-fold>
});

StatusMarker.displayName = 'StatusMarker';

StatusMarker.propTypes = {
  status: PropTypes.instanceOf(Enums.SystemState),
  inactive: PropTypes.bool,
  size: PropTypes.oneOfType([PropTypes.number, PropTypes.instanceOf(StatusMarkerSize)]),
  rotation: PropTypes.number,
};

StatusMarker.defaultProps = {
  status: Enums.SystemState.UNKNOWN,
  inactive: false,
  size: StatusMarkerSize.NORMAL,
  rotation: 0,
};

export { StatusMarkerSize };
export default StatusMarker;
