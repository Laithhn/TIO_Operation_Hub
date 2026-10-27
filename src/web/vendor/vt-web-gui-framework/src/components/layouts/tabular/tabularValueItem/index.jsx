import PropTypes from 'prop-types';
import { memo } from 'react';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import Spinner, { SpinnerType } from 'components/helpers/spinner';
import bbCode from 'utils/bbCode';
import classNames from 'utils/classNames';

import { TabularStyle, TabularValueItemState } from '../enums';
import css from './tabularValueItem.scss';


/**
 * Memoized React component of a tabular value item, that can be used as child of component Tabular.
 * Note that it is only memoized, if the given children is a string or number.
 */
const TabularValueItem = memo(({
  tabularStyle, paddingTopBottom, paddingLeftRight, label, labelMaxWidth, hint, subLabel, state,
  valueSize, valueColor, children,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const withHint = (hint !== TabularValueItem.defaultProps.hint);
  const withSubLabel = (subLabel !== TabularValueItem.defaultProps.subLabel);


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
    [css.tabularStyleIsLine]: (tabularStyle === TabularStyle.LINE),
    [css.tabularStyleIsBackground]: (tabularStyle === TabularStyle.BACKGROUND),
    [css.withHint]: (withHint && !withSubLabel),
    [css.withSubLabel]: (!withHint && withSubLabel),
    [css.withHintAndSubLabel]: (withHint && withSubLabel),
  });

  const tabularValueItemStyle = {
    gridTemplateColumns: `minmax(min-content, ${(typeof labelMaxWidth === 'number') ? `${labelMaxWidth}px` : labelMaxWidth})`,
    padding: `${paddingTopBottom.cssValue} ${paddingLeftRight.cssValue}`,
  };

  const valueClasses = classNames(css.value, {
    [css.typoValueSmall]: (valueSize === Enums.ValueSize.SMALL),
    [css.typoDisabled]: (state === TabularValueItemState.DISABLED),
  });

  const valueStyle = ((state === TabularValueItemState.IDLE) && (valueColor !== TabularValueItem.defaultProps.valueColor))
    ? { color: valueColor.color }
    : {};

  return (
    <div className={tabularValueItemClasses} style={tabularValueItemStyle}>
      <span className={css.label}>{bbCode(label)}</span>
      {withHint && <span className={css.hint}>{bbCode(hint)}</span>}
      {withSubLabel && <span className={css.subLabel}>{bbCode(subLabel)}</span>}
      {(state === TabularValueItemState.LOADING)
        ? (
          <Spinner
            justifySelf={Enums.PlaceSelfItems.END}
            type={SpinnerType.BARS}
            dim={defines.space.small}
          />
        ) : (
          <span className={valueClasses} style={valueStyle}>{children}</span>
        )}
    </div>
  );
  //                                                                                  </editor-fold>
});

TabularValueItem.displayName = 'TabularValueItem';

TabularValueItem.propTypes = {
  tabularStyle: PropTypes.instanceOf(TabularStyle), // from Tabular
  paddingTopBottom: PropTypes.instanceOf(Enums.GapAndPadding), // from Tabular
  paddingLeftRight: PropTypes.instanceOf(Enums.GapAndPadding), // from Tabular
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  labelMaxWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  hint: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  subLabel: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  state: PropTypes.instanceOf(TabularValueItemState),
  valueSize: PropTypes.instanceOf(Enums.ValueSize),
  valueColor: PropTypes.instanceOf(Enums.ValueColor),
  children: PropTypes.node,
};

TabularValueItem.defaultProps = {
  tabularStyle: TabularStyle.LINE,
  paddingTopBottom: Enums.GapAndPadding.NONE,
  paddingLeftRight: Enums.GapAndPadding.NONE,
  label: '',
  labelMaxWidth: 'max-content',
  hint: '',
  subLabel: '',
  state: TabularValueItemState.IDLE,
  valueSize: Enums.ValueSize.NORMAL,
  valueColor: Enums.ValueColor.NONE,
  children: null,
};

export default TabularValueItem;
