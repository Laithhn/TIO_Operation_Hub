import { useImperativeHandle, useRef } from 'react';

import { getTypoColorClass } from 'assets/styles';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';

import * as css from './text.scss';
import { type TextProps, textStylingProps } from './text.types';


/**
 * React component of the indicator component "Text" to display a simple text in dashboard contents
 * of VtWebGuiFramework. Note that it is only memoized, if the given children is a string or number,
 * but you can also use <br /> and <Link> and so on.
 */
const Text = ({
  ref, type = 'value', size = 'small', color, monotype = false, disable = false,
  children, ...restProps
}: TextProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const textElemRef = useRef<HTMLSpanElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { elemStyle } = useStylingProps(restProps, textStylingProps, { addCombinedStyle: true });

  const isValue = !['headline', 'title', 'label', 'hint'].includes(type);

  const textClasses = classNames({
    [css.monotype]: (isValue && monotype),
    [css.typoSetHeadline]: (type === 'headline'),
    [css.typoSetTitle]: (type === 'title'),
    [css.typoSetLabel]: (type === 'label'),
    [css.typoSetHint]: (type === 'hint'),
    ...(isValue
      ? {
        [css.typoSetValue]: true,
        [css.typoValueSmall]: !['normal', 'large', 'xl', 'xxl'].includes(size),
        [css.typoValueLarge]: (size === 'large'),
        [css.typoValueXL]: (size === 'xl'),
        [css.typoValueXXL]: (size === 'xxl'),
        // a disabled value keeps the disabled colour of its typo set
        ...(color && !disable && { [getTypoColorClass(css, color)]: true }),
      }
      : {}),
    [css.typoDisabled]: disable,
  });


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    clientLeft: textElemRef.current?.clientLeft,
    clientWidth: textElemRef.current?.clientWidth,
    clientTop: textElemRef.current?.clientTop,
    clientHeight: textElemRef.current?.clientHeight,
    getBoundingClientRect: () => textElemRef.current?.getBoundingClientRect(),
  }), []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <span ref={textElemRef} className={textClasses} style={elemStyle}>
      {children}
    </span>
  );
  //                                                                                  </editor-fold>
};

Text.displayName = 'Text';


export { Text };
