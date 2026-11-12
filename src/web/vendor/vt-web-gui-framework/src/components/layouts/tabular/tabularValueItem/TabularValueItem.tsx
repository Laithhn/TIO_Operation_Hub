import { color, space } from 'assets/styles';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { Spinner } from 'components/indicators/spinner';
import { bbCode } from 'utils/bbCode';
import { classNames } from 'utils/classNames';

import * as css from './tabularValueItem.scss';
import {
  type TabularValueItemProps, TabularValueItemStatus, tabularValueItemUsedStylingProps,
} from './tabularValueItem.types';


/**
 * React component of the sub-component "TabularValueItem" of the layout component "Tabular", an item
 * displaying a labeled value that can be used as child of a tabular.
 */
const TabularValueItem = ({
  id, tabularStyle = 'line', label = '', labelMaxWidth = 'max-content',
  hint = '', subLabel = '', status = TabularValueItemStatus.IDLE, valueSize = 'normal', valueColor,
  children, ...restProps
}: TabularValueItemProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // the spacing, colour and radius props injected by the tabular are part of "restProps" and are
  // derived here like any other styling prop
  const { elemStyle } = useStylingProps(restProps, tabularValueItemUsedStylingProps, { addCombinedStyle: true });

  const withHint = !!hint;
  const withSubLabel = !!subLabel;


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

  const tabularValueItemClasses = classNames(css.tabularValueItem, {
    [css.tabularStyleIsLine]: (tabularStyle === 'line'),
    [css.tabularStyleIsBackground]: (tabularStyle === 'background'),
    [css.withHint]: (withHint && !withSubLabel),
    [css.withSubLabel]: (!withHint && withSubLabel),
    [css.withHintAndSubLabel]: (withHint && withSubLabel),
  });

  const tabularValueItemStyle = {
    ...elemStyle,
    gridTemplateColumns: `minmax(min-content, ${(typeof labelMaxWidth === 'number') ? `${labelMaxWidth}px` : labelMaxWidth})`,
  };

  const valueClasses = classNames(css.value, {
    [css.typoValueSmall]: (valueSize === 'small'),
    [css.typoDisabled]: (status === TabularValueItemStatus.DISABLED),
  });

  const valueStyle = ((status === TabularValueItemStatus.IDLE) && valueColor)
    ? { color: color[valueColor] }
    : {};

  return (
    <div
      {...(id && { id })}
      className={tabularValueItemClasses}
      style={tabularValueItemStyle}
    >
      <span className={classNames(css.label)}>{bbCode(label)}</span>
      {!!hint && <span className={classNames(css.hint)}>{bbCode(hint)}</span>}
      {!!subLabel && <span className={classNames(css.subLabel)}>{bbCode(subLabel)}</span>}
      {(status === TabularValueItemStatus.LOADING)
        ? <Spinner justifySelf="end" type="bars" dim={space.normal} />
        : <span className={valueClasses} style={valueStyle}>{children}</span>}
    </div>
  );
  //                                                                                  </editor-fold>
};

TabularValueItem.displayName = 'TabularValueItem';


export { TabularValueItem };
