import PropTypes from 'prop-types';

import useStylingProps from 'components/hooks/useStylingProps';

import stylingProps from './stylingProps';
import css from './toolbarContrItem.scss';


/**
 * React component of a toolbar container item, that is a grid container to place further elements
 * inside a toolbar (component Toolbar). The children elements can only placed in one row.
 */
const ToolbarContrItem = ({ children, ...restProps }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { elemStyle } = useStylingProps(restProps, stylingProps, { addCombinedStyle: true });


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

  return (
    <div className={css.toolbarContrItem} style={elemStyle}>
      {children}
    </div>
  );
  //                                                                                  </editor-fold>
};

ToolbarContrItem.displayName = 'ToolbarContrItem';

ToolbarContrItem.propTypes = {
  children: PropTypes.node,
};

ToolbarContrItem.defaultProps = {
  children: null,
};

export default ToolbarContrItem;
