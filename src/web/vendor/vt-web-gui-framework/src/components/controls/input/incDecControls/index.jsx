import PropTypes from 'prop-types';
import {
  memo, useRef, useCallback, useEffect,
} from 'react';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import useInteractions from 'components/hooks/useInteractions';
import classNames from 'utils/classNames';

import inputDefines from '../defines';
import css from './incDecControls.scss';


const iconDimPx = `${inputDefines.incDecControls.iconDim}px`;


/**
 * Memoized React component
 */
const IncDecControls = memo(({
  darkTheme, disableIncrement, disableDecrement, onIncDec,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const incDecIntervalRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { viewbox, getIconPath } = useIconsAsync();


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const { interactionProps: incInteractionProps } = useInteractions({
    enableClick: true,
    disabled: disableIncrement,
    holdable: true,
    onClick: useCallback((event) => { onIncDec(true, event); }, [onIncDec]),
    onHoldStart: useCallback((event) => {
      incDecIntervalRef.current = setInterval(() => {
        onIncDec(true, event);
      }, 150);
    }, [onIncDec]),
    onHoldEnd: useCallback(() => {
      clearInterval(incDecIntervalRef.current);
    }, []),
  });


  const { interactionProps: decInteractionProps } = useInteractions({
    enableClick: true,
    disabled: disableDecrement,
    holdable: true,
    onClick: useCallback((event) => { onIncDec(false, event); }, [onIncDec]),
    onHoldStart: useCallback((event) => {
      incDecIntervalRef.current = setInterval(() => {
        onIncDec(false, event);
      }, 150);
    }, [onIncDec]),
    onHoldEnd: useCallback(() => {
      clearInterval(incDecIntervalRef.current);
    }, []),
  });


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => () => {
    clearInterval(incDecIntervalRef.current);
  }, []);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const incIconClasses = classNames(css.incIcon, {
    [css.typoDarkTheme]: darkTheme,
    [css.typoDisabled]: disableIncrement,
    [css.clickable]: !disableIncrement,
  });

  const decIconClasses = classNames(css.decIcon, {
    [css.typoDarkTheme]: darkTheme,
    [css.typoDisabled]: disableDecrement,
    [css.clickable]: !disableDecrement,
  });

  return (
    <span className={css.incDecControls}>
      <svg
        role="button"
        className={incIconClasses}
        width={iconDimPx}
        height={iconDimPx}
        viewBox={viewbox}
        {...incInteractionProps}
      >
        <path d={getIconPath('NAVIUP')} />
      </svg>
      <svg
        role="button"
        className={decIconClasses}
        width={iconDimPx}
        height={iconDimPx}
        viewBox={viewbox}
        {...decInteractionProps}
      >
        <path d={getIconPath('NAVIDOWN')} />
      </svg>
    </span>
  );
  //                                                                                  </editor-fold>
});

IncDecControls.displaName = 'IncDecControls';

IncDecControls.propTypes = {
  darkTheme: PropTypes.bool,
  disableIncrement: PropTypes.bool,
  disableDecrement: PropTypes.bool,
  onIncDec: PropTypes.func,
};

IncDecControls.defaultProps = {
  darkTheme: false,
  disableIncrement: false,
  disableDecrement: false,
  onIncDec() {},
};

export default IncDecControls;
