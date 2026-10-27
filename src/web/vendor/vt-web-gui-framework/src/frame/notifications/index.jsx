import { memo } from 'react';
import { useSelector } from 'react-redux';

import { selectors } from 'store';

import Notification from './notification';
import css from './notifications.scss';


/**
 * Memoized React component as container of all notifications.
 */
const Notifications = memo(() => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const maxWidth = useSelector(selectors.notifications.getMaxWidth);
  const allNotificationIds = useSelector(selectors.notifications.getAllNotifcationIds);


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

  const notificationsStyle = {
    width: `${maxWidth}px`,
  };

  return (
    <div className={css.notifications} style={notificationsStyle}>
      {allNotificationIds.map((id) => (
        <Notification
          key={id}
          id={id}
          maxWidth={maxWidth}
        />
      ))}
    </div>
  );
  //                                                                                  </editor-fold>
});

Notifications.displayName = 'Notifications';

export default Notifications;
