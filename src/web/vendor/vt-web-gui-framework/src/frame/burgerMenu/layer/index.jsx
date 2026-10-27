import PropTypes from 'prop-types';
import { memo } from 'react';

import classNames from 'utils/classNames';

import NavBackButton from './navBackButton';
import MenuLists from './menuLists';
import css from './layer.scss';


/**
 * Memoized React component of a layer of a certain parent menu node ID, containing a list of menu
 * nodes a navigate back button.
 */
const Layer = memo(({ menuNodeId, show, onClickLink }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


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


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const layerClasses = classNames(css.layer, {
    [css.show]: show,
  });

  return (
    <div className={layerClasses}>
      {menuNodeId && <NavBackButton menuNodeId={menuNodeId} onClick={onClickLink} />}
      <MenuLists parentMenuNodeId={menuNodeId} onClickLink={onClickLink} />
    </div>
  );
  //                                                                                  </editor-fold>
});

Layer.displayName = 'Layer';

Layer.propTypes = {
  menuNodeId: PropTypes.string,
  show: PropTypes.bool,
  onClickLink: PropTypes.func,
};

Layer.defaultProps = {
  menuNodeId: null,
  show: false,
  onClickLink() {},
};

export default Layer;
