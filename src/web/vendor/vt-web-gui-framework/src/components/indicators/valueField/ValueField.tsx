import { useImperativeHandle, useRef } from 'react';

import { getTypoColorClass, space } from 'assets/styles';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { Spinner } from 'components/indicators/spinner';
import { bbCode } from 'utils/bbCode';
import { classNames } from 'utils/classNames';

import * as css from './valueField.scss';
import { type ValueFieldProps, ValueFieldStatus, valueFieldStylingProps } from './valueField.types';


/**
 * React component of the indicator component "ValueField" to display a value at dashboard contents
 * of VtWebGuiFramework. Optionally, the value can be given a unit and / or a hint text.
 */
const ValueField = ({
  ref, id, darkTheme, title = '', titleAsLabel = false, value = '', unit = '', hint = '',
  status = ValueFieldStatus.IDLE, valueSize = 'normal', valueColor, onClick, ...restProps
}: ValueFieldProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const valueFieldElemRef = useRef<HTMLDivElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { elemStyle } = useStylingProps(restProps, valueFieldStylingProps, { addCombinedStyle: true, darkTheme });
  const isClickable = (status === ValueFieldStatus.IDLE) && (typeof onClick === 'function');
  const hasContactPane = (restProps.boxShadow === 'contact');
  // The value's colour, which only a field that is idle shows; its class takes the form for the
  // ground the field sits on.
  const valueColorClass = ((status === ValueFieldStatus.IDLE) && valueColor) ? getTypoColorClass(css, valueColor) : '';

  const titleClasses = classNames(css.title, {
    [css.titleAsLabel]: titleAsLabel,
  });

  const valueClasses = classNames(css.value, valueColorClass, {
    [css.typoValueLarge]: (valueSize === 'large'),
    [css.typoValueXL]: (valueSize === 'xl'),
    [css.typoValueXXL]: (valueSize === 'xxl'),
    [css.typoDisabled]: (status === ValueFieldStatus.DISABLED),
  });

  const unitClasses = classNames(css.unit, valueColorClass, {
    [css.typoValueSmall]: !['xl', 'xxl'].includes(valueSize),
    [css.typoValueLarge]: (valueSize === 'xxl'),
    [css.typoDisabled]: (status === ValueFieldStatus.DISABLED),
  });

  const hintClasses = classNames(css.hint, {
    [css.typoValueSmall]: !['xl', 'xxl'].includes(valueSize),
    [css.typoDisabled]: (status === ValueFieldStatus.DISABLED),
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
    clientLeft: valueFieldElemRef.current?.clientLeft,
    clientWidth: valueFieldElemRef.current?.clientWidth,
    clientTop: valueFieldElemRef.current?.clientTop,
    clientHeight: valueFieldElemRef.current?.clientHeight,
    getBoundingClientRect: () => valueFieldElemRef.current?.getBoundingClientRect(),
  }), []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (status === ValueFieldStatus.LOADING) {
    return (
      <div ref={valueFieldElemRef} className={classNames(css.valueField, { [css.contactPane]: hasContactPane })} style={elemStyle}>
        {!!title && <span className={titleClasses}>{title}</span>}
        <Spinner placeSelf="center" type="bars" dim={space.large} />
      </div>
    );
  }


  const valueFieldClasses = classNames(css.valueField, {
    [css.contactPane]: hasContactPane,
    [css.clickable]: !!onClick,
  });

  return (
    <div
      ref={valueFieldElemRef}
      {...(id && { id })}
      className={valueFieldClasses}
      style={elemStyle}
      {...(isClickable && { onClick: (event) => {
        onClick({ event });
      } })}
    >
      {!!title && <span className={titleClasses}>{title}</span>}
      <span className={css.valueContr}>
        <span className={valueClasses}>{value}</span>
        {!!unit && <span className={unitClasses}>{unit}</span>}
      </span>
      {!!hint && <span className={hintClasses}>{bbCode(hint)}</span>}
    </div>
  );
  //                                                                                  </editor-fold>
};

ValueField.displayName = 'ValueField';


export { ValueField };
