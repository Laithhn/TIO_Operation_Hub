import { Children, cloneElement } from 'react';
import PropTypes from 'prop-types';

import Enums from 'assets/enums';
import Scrolling from 'components/helpers/scrolling';
import useStylingProps from 'components/hooks/useStylingProps';
import Toolbar from 'components/layouts/toolbar';
import classNames from 'utils/classNames';

import TabularContrItem from './tabularContrItem';
import TabularDescItem from './tabularDescItem';
import TabularValueItem from './tabularValueItem';
import { TabularStyle, TabularValueItemState } from './enums';
import stylingProps from './stylingProps';
import css from './tabular.scss';


/**
 * React component of a tabular section for dashboard contents of VtWebGuiFramework. A tabular is a
 * simple table containing predefined child containers.
 */
const Tabular = ({
  tabularStyle, scrollBarV, itemPaddingTopBottom, itemPaddingLeftRight, noLastLine, children,
  ...restProps
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle, innerElemStyle, elemStyle } = useStylingProps(restProps, stylingProps, { addCombinedStyle: !scrollBarV });
  let modItemPaddingTopBottom, modItemPaddingLeftRight;

  if (tabularStyle === TabularStyle.LINE) {
    modItemPaddingTopBottom = itemPaddingTopBottom ?? Enums.GapAndPadding.XS;
    modItemPaddingLeftRight = itemPaddingLeftRight ?? Enums.GapAndPadding.NONE;
  } else {
    modItemPaddingTopBottom = itemPaddingTopBottom ?? Enums.GapAndPadding.XS;
    modItemPaddingLeftRight = itemPaddingLeftRight ?? Enums.GapAndPadding.SMALL;
  }

  const content = Children.map(children, (child) => {
    switch (child?.type) {
      case Toolbar:
        return cloneElement(child, {
          paddingTop: modItemPaddingTopBottom,
          paddingBottom: modItemPaddingTopBottom,
          ...child.props,
          paddingRight: modItemPaddingLeftRight,
          paddingLeft: modItemPaddingLeftRight,
          withLine: (tabularStyle === TabularStyle.LINE),
        });

      case TabularDescItem:
      case TabularValueItem:
      case TabularContrItem:
        return cloneElement(child, {
          ...child.props,
          tabularStyle,
          paddingTopBottom: modItemPaddingTopBottom,
          paddingLeftRight: modItemPaddingLeftRight,
        });

      default:
        return null;
    }
  });


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

  const tabularClasses = classNames(css.tabular, {
    [css.tabularStyleIsLine]: (tabularStyle === TabularStyle.LINE),
    [css.tabularStyleIsBackground]: (tabularStyle === TabularStyle.BACKGROUND),
    [css.noLastLine]: noLastLine,
  });

  if (scrollBarV) {
    return (
      <Scrolling style={outerElemStyle} vertical>
        <div className={tabularClasses} style={innerElemStyle}>
          {content}
        </div>
      </Scrolling>
    );
  }

  return (
    <div className={tabularClasses} style={elemStyle}>
      {content}
    </div>
  );
};

Tabular.displayName = 'Tabular';

Tabular.propTypes = {
  tabularStyle: PropTypes.instanceOf(TabularStyle),
  scrollBarV: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
  itemPaddingTopBottom: PropTypes.instanceOf(Enums.GapAndPadding),
  itemPaddingLeftRight: PropTypes.instanceOf(Enums.GapAndPadding),
  noLastLine: PropTypes.bool,
  children: (props, propName, componentName) => (
    (
      (props[propName] !== null)
      && Children.toArray(props[propName]).some(
        (child) => ![Toolbar, TabularContrItem, TabularDescItem, TabularValueItem].includes(child.type),
      )
    )
      ? new Error(`Invalid prop "${propName}" passed to "${componentName}". Expected only one or more components of type Toolbar, TabularContrItem, TabularDescItem or TabularValueItem.`)
      : undefined
  ),
};

Tabular.defaultProps = {
  tabularStyle: TabularStyle.LINE,
  scrollBarV: false,
  itemPaddingTopBottom: null,
  itemPaddingLeftRight: null,
  noLastLine: false,
  children: null,
};

export {
  TabularStyle, TabularContrItem, TabularDescItem, TabularValueItem, TabularValueItemState,
};
export default Tabular;
