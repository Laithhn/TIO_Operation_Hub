import { useEffect, useRef, useState } from 'react';

import { Button, type ButtonProps, ButtonStatus } from 'components/controls/button';

import { type ArrowButtonProps } from './arrowButton.types';


/**
 * React sub-component of the helper component "ScrollButton" to render the button.
 */
const ArrowButton = ({
  dir, pos, isRtl, holdable, disable, onClick,
}: ArrowButtonProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [hold, setHold] = useState(false);

  const holdIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let icon = dir.toUpperCase(),
    alignSelf: React.CSSProperties['alignSelf'],
    justifySelf: React.CSSProperties['justifySelf'];

  if (isRtl) {
    if (icon === 'LEFT') {
      icon = 'RIGHT';
    } else if (icon === 'RIGHT') {
      icon = 'LEFT';
    }
  }

  icon = `NAVI${icon}${hold ? 'FAST' : ''}`;

  if ((dir === 'left') || (dir === 'right')) {
    alignSelf = pos;
    justifySelf = 'center';
  } else {
    alignSelf = 'center';
    justifySelf = pos;
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the callback prop "onClick" of the control component "Button".
   */
  const handleClick: NonNullable<ButtonProps['onClick']> = () => {
    onClick({ dir });
  };


  /**
   * Handler for the callback prop "onHoldStart" of the control component "Button".
   */
  const handleHoldStart: NonNullable<ButtonProps['onHoldStart']> = () => {
    setHold(true);

    holdIntervalRef.current = setInterval(() => {
      onClick({ dir });
    }, 150);
  };


  /**
   * Handler for the callback prop "onHoldEnd" of the control component "Button".
   */
  const handleHoldEnd: NonNullable<ButtonProps['onHoldEnd']> = () => {
    setHold(false);
    clearInterval(holdIntervalRef.current);
  };


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

  // The button carries its alignment itself: it is given none of the position props, so it stays a
  // grid item of the shader around it and is placed by these two - which is what "pos" and "dir"
  // mean here. Pixels could not express it, the length of the edge it is centred on being unknown.
  return (
    <Button
      alignSelf={alignSelf}
      justifySelf={justifySelf}
      type="overlaid"
      status={disable ? ButtonStatus.DISABLED : ButtonStatus.IDLE}
      holdable={holdable}
      icon={icon}
      onClick={handleClick}
      onHoldStart={handleHoldStart}
      onHoldEnd={handleHoldEnd}
    />
  );
  //                                                                                  </editor-fold>
};

ArrowButton.displayName = 'ArrowButton';


export { ArrowButton };
