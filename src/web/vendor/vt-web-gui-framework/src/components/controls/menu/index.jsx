import PropTypes from 'prop-types';

import { TICKBOX_MIXED } from 'components/controls/checkBox';
import Card from 'components/popups/card';

import LongMenu from './longMenu';
import ShortMenu from './shortMenu';
import propTypeEntry from './propTypeEntry';


/**
 * Stateless React component of the control component for menus.
 * Note, that if you call this component as a function, the default props are not considered!
 */
const Menu = ({
  id, show, anchorElemRef, placeBesideAnchorElem, limitMenu, entries, onClick, onClose, children,
}) => {
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const realEntries = (typeof entries === 'function') ? entries(id ?? '') : entries;
  const isLongMenu = Array.isArray(realEntries) && (realEntries.length > (limitMenu ?? Infinity));


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <Card
      id={id}
      show={show}
      anchorElemRef={anchorElemRef}
      placeBesideAnchorElem={placeBesideAnchorElem}
      smallShadow
      onClickBeside={onClose}
      onPressEscape={onClose}
      onMoveAnchorElem={onClose}
    >
      {children}
      {isLongMenu
        ? (
          <LongMenu
            id={id}
            entries={realEntries}
            limitMenu={limitMenu}
            onClickMenuItem={onClick}
          />
        ) : (
          <ShortMenu
            id={id}
            entries={realEntries}
            onClickMenuItem={onClick}
          />
        )}
    </Card>
  );
  //                                                                                  </editor-fold>
};

Menu.displayName = 'Menu';

Menu.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  show: PropTypes.bool,
  anchorElemRef: PropTypes.object,
  placeBesideAnchorElem: PropTypes.bool,
  limitMenu: PropTypes.number,
  entries: PropTypes.oneOfType([PropTypes.func, PropTypes.arrayOf(propTypeEntry)]),
  onClick: PropTypes.func,
  onClose: PropTypes.func,
  children: PropTypes.node,
};

Menu.defaultProps = {
  id: '',
  show: null,
  anchorElemRef: null,
  placeBesideAnchorElem: false,
  limitMenu: Infinity,
  entries: [],
  onClick() {},
  onClose() {},
  children: null,
};

export { TICKBOX_MIXED };
export default Menu;
