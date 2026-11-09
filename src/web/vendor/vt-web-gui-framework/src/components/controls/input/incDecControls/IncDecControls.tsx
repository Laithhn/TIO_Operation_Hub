import { useEffect, useRef } from 'react';

import { spacePx } from 'assets/styles';
import { useInteractions } from 'components/hooks/useInteractions';
import { classNames } from 'utils/classNames';

import { getIconPath, viewbox } from 'VtWebGuiIcons/src';

import * as css from './incDecControls.scss';
import type { IncDecControlsProps } from './incDecControls.types';


const iconDimPx = spacePx.small;


/**
 * React sub-component of the control component "Input" to show arrow icons to increment and
 * decrement a numeric value.
 */
const IncDecControls = ({
  disableIncrement, disableDecrement, onIncDec,
}: IncDecControlsProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const incDecIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const { interactionProps: incInteractionProps } = useInteractions<SVGElement>({
    enablePointer: true,
    disableAllEvents: disableIncrement,
    holdable: true,
    onClick: (event) => {
      onIncDec(true, event);
    },
    onHoldStart: (event) => {
      incDecIntervalRef.current = setInterval(() => {
        onIncDec(true, event);
      }, 150);
    },
    onHoldEnd: () => {
      clearInterval(incDecIntervalRef.current);
    },
  });


  const { interactionProps: decInteractionProps } = useInteractions<SVGElement>({
    enablePointer: true,
    disableAllEvents: disableDecrement,
    holdable: true,
    onClick: (event) => {
      onIncDec(false, event);
    },
    onHoldStart: (event) => {
      incDecIntervalRef.current = setInterval(() => {
        onIncDec(false, event);
      }, 150);
    },
    onHoldEnd: () => {
      clearInterval(incDecIntervalRef.current);
    },
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
    [css.typoDisabled]: disableIncrement,
    [css.clickable]: !disableIncrement,
  });

  const decIconClasses = classNames(css.decIcon, {
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
};

IncDecControls.displayName = 'IncDecControls';


export { IncDecControls };
