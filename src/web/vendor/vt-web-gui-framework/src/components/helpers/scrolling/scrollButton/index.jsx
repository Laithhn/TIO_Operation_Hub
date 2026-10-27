import PropTypes from 'prop-types';
import {
  memo, useState, useRef, useCallback, useEffect,
} from 'react';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import useInteractions from 'components/hooks/useInteractions';
import { hooks } from 'store';
import classNames from 'utils/classNames';

import css from './scrollButton.scss';


const iconDimPx = `${defines.space.small}px`;


/**
 * Memoized React component of a navigation field with buttons and optional shader at the top,
 * bottom, left or right position.
 */
const ScrollBar = memo(({
  id, dir, pos, show, showShader, backgroundColor, holdable, disabled, onClick,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = hooks.useI18n();

  const [hold, setHold] = useState(false);

  const holdIntervalRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { viewbox, getIconPath } = useIconsAsync();
  let icon = dir.toUpperCase(),
    realBackgroundColor, darkTheme, shaderBackground;

  if (isRtl) {
    if (icon === 'LEFT') {
      icon = 'RIGHT';
    } else if (icon === 'RIGHT') {
      icon = 'LEFT';
    }
  }

  icon = getIconPath(`NAVI${icon}${hold ? 'FAST' : ''}`);

  if (backgroundColor instanceof Enums.BackgroundColor) {
    realBackgroundColor = backgroundColor.color;
    darkTheme = backgroundColor.darkTheme;
  } else if (typeof backgroundColor === 'string') {
    realBackgroundColor = backgroundColor;
    darkTheme = false;
  }

  if (showShader && (backgroundColor !== Enums.BackgroundColor.NONE)) {
    switch (dir) {
      case 'up': shaderBackground = `linear-gradient(to bottom, ${realBackgroundColor} 10%, transparent)`; break;
      case 'down': shaderBackground = `linear-gradient(to top, ${realBackgroundColor} 10%, transparent)`; break;
      case 'left': shaderBackground = `linear-gradient(to ${isRtl ? 'left' : 'right'}, ${realBackgroundColor} 10%, transparent)`; break;
      case 'right': shaderBackground = `linear-gradient(to ${isRtl ? 'right' : 'left'}, ${realBackgroundColor} 10%, transparent)`; break;
      // no default
    }
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const { interactionProps } = useInteractions({
    enableClick: true,
    enableKeys: true,
    disabled,
    holdable,
    tabIndex: 0,
    onClick: useCallback(() => {
      onClick({ id, pos, dir });
    }, [id, pos, dir, onClick]),
    onHoldStart: useCallback(() => {
      setHold(true);
      holdIntervalRef.current = setInterval(() => {
        onClick({ id, pos, dir });
      }, 150);
    }, [id, pos, dir, onClick]),
    onHoldEnd: useCallback(() => {
      setHold(false);
      clearInterval(holdIntervalRef.current);
    }, []),
  });


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => () => {
    clearInterval(holdIntervalRef.current);
  }, []);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const shaderClasses = classNames(css.shader, {
    [css.show]: show,
    [css.scrollUp]: (dir === 'up'),
    [css.scrollDown]: (dir === 'down'),
    [css.scrollLeft]: (dir === 'left'),
    [css.scrollRight]: (dir === 'right'),
  });

  const shaderStyle = {
    background: shaderBackground,
  };

  const scrollButtonClasses = classNames(css.scrollButton, {
    [css.disabled]: disabled,
    [css.darkTheme]: darkTheme,
    [css.scrollUp]: (dir === 'up'),
    [css.scrollDown]: (dir === 'down'),
    [css.scrollLeft]: (dir === 'left'),
    [css.scrollRight]: (dir === 'right'),
    [css.buttonPosStart]: (pos === 'start'),
    [css.buttonPosCenter]: (pos === 'center'),
    [css.buttonPosEnd]: (pos === 'end'),
  });

  const scrollButtonStyle = {
    background: realBackgroundColor,
  };

  return (
    <div className={shaderClasses} style={shaderStyle}>
      <span
        role="button"
        className={scrollButtonClasses}
        style={scrollButtonStyle}
        {...interactionProps}
      >
        <svg width={iconDimPx} height={iconDimPx} viewBox={viewbox}>
          <path d={icon} />
        </svg>
      </span>
    </div>
  );
  //                                                                                  </editor-fold>
});

ScrollBar.displayName = 'ScrollBar';

ScrollBar.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  dir: PropTypes.oneOf(['up', 'down', 'left', 'right']).isRequired,
  pos: PropTypes.oneOf(['start', 'center', 'end']),
  show: PropTypes.bool,
  showShader: PropTypes.bool,
  backgroundColor: PropTypes.oneOfType([PropTypes.instanceOf(Enums.BackgroundColor), PropTypes.string]),
  holdable: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
};

ScrollBar.defaultProps = {
  id: '',
  pos: 'start',
  show: false,
  showShader: false,
  backgroundColor: Enums.BackgroundColor.NONE,
  holdable: false,
  disabled: false,
  onClick() {},
};

export default ScrollBar;
