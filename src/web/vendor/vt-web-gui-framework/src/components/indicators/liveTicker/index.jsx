import { memo, useRef, useEffect } from 'react';

import { Scrolling } from 'components/helpers/scrolling';
import { useStylingProps } from 'components/hooks/useStylingProps';
import Text from 'components/indicators/text';
import { classNames } from 'utils/classNames';

import Cursor from './cursor';
import * as css from './liveTicker.scss';
import stylingProps from './stylingProps';


//LiveTicker.propTypes = {
//  entries: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
//  size: PropTypes.string,
//  darkTheme: PropTypes.bool,
//  showCursor: PropTypes.bool,
//};

/**
 * Memoized React component of a live ticker.
 */
const LiveTicker = memo(({
  entries = [], size = 'small', darkTheme = false, showCursor = false, ...restProps
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const scrollBarRef = useRef();
  const wasScrolledRef = useRef(false);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle, innerElemStyle } = useStylingProps(restProps, stylingProps);

  const prevScrollDims = scrollBarRef.current?.getScrollDims() ?? {};
  const prevIsScrollBar = (prevScrollDims.scrollHeight > prevScrollDims.clientHeight);
  const prevScrollTopPercentage = prevScrollDims.scrollTopPercentage ?? 0;


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

  useEffect(() => {
    if (
      ((prevScrollTopPercentage === 0) && !wasScrolledRef.current)
      || (prevScrollTopPercentage === 100)
    ) {
      scrollBarRef.current.scrollToBottom();
    }

    if (!wasScrolledRef.current && (prevScrollTopPercentage > 0)) {
      wasScrolledRef.current = true;
    }

    if (!prevIsScrollBar) {
      wasScrolledRef.current = false;
    }
  }, [entries, prevIsScrollBar, prevScrollTopPercentage]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const liveTickerClasses = classNames(css.liveTicker, {
    [css.asGrid]: !Array.isArray(entries),
    [css.asFlex]: Array.isArray(entries),
  });

  return (
    <Scrolling
      ref={scrollBarRef}
      style={outerElemStyle}
      vertical
      shaderColor={restProps.backgroundColor}
    >
      <div className={liveTickerClasses} style={innerElemStyle}>
        {entries.map((entry, idx) => (
          <Text
            key={idx} // eslint-disable-line react/no-array-index-key
            monotype
            size={size}
            darkTheme={darkTheme}
          >
            {entry}
          </Text>
        ))}
        {showCursor && (
          <Cursor
            size={size}
            darkTheme={darkTheme}
          />
        )}
      </div>
    </Scrolling>
  );
  //                                                                                  </editor-fold>
});

LiveTicker.displayName = 'LiveTicker';

export default LiveTicker;
