import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

import { selectors } from 'store';

import MenuNodeLink from './menuNodeLink';
import css from './primaryMenuPart.scss';


/**
 * React component of a section in the mega menu with the link of a given primary menu node with its
 * submenu nodes.
 */
const PrimaryMenuPart = ({ menuNode, onClose }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const submenuNodes = useSelector((state) => selectors.menus.primaryMenu.getVisibleSubmenuNodesById(state, menuNode.id));


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

  return (
    <div className={css.primaryMenuPart}>
      <MenuNodeLink
        key={menuNode.id}
        menuNode={menuNode}
        onClose={onClose}
      />
      {submenuNodes.map((submenuNode) => (
        <MenuNodeLink
          key={submenuNode.id}
          menuNode={submenuNode}
          onClose={onClose}
        />
      ))}
    </div>
  );
  //                                                                                  </editor-fold>
};

PrimaryMenuPart.displayName = 'PrimaryMenuPart';

PrimaryMenuPart.propTypes = {
  menuNode: PropTypes.shape({
    id: PropTypes.string,
    caption: PropTypes.string,
    urlPath: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func,
};

PrimaryMenuPart.defaultProps = {
  onClose() {},
};

export default PrimaryMenuPart;
