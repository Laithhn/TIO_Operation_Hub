import PropTypes from 'prop-types';

import css from './marker.scss';


/**
 * Stateless React component of the marker, that is placed on top of the current selected option
 * item of the menu of the select box.
 * Note, that if you call this component as a function, the default props are not considered!
 */
const Marker = ({ top, onClick }) => {
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

  /**
   * Handler for synthetic React event "onClick" to always delegate click events at this marker to
   * the parent component.
   */
  const handleClick = (event) => {
    event.stopPropagation();
    onClick(event);
  };


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <div // eslint-disable-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
      className={css.marker}
      style={{ transform: `translateY(${top ?? 0}px)` }}
      onClick={handleClick}
    />
  );
  //                                                                                  </editor-fold>
};

Marker.displayName = 'Marker';

Marker.propTypes = {
  top: PropTypes.number,
  onClick: PropTypes.func,
};

Marker.defaultProps = {
  top: 0,
  onClick() {},
};

export default Marker;
