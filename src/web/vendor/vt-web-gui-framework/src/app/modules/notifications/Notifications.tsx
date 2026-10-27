import { useSelector } from 'components/hooks/useSelector';

import { Notification } from './notification/Notification';
import * as css from './notifications.scss';
import { selectAllIds, selectMaxWidth } from './notifications.slice';


/**
 * React component of the app module "Notifications".
 */
const Notifications = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const maxWidth = useSelector(selectMaxWidth);
  const allNotificationIds = useSelector(selectAllIds);


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
        <Notification key={id} id={id} maxWidth={maxWidth} />
      ))}
    </div>
  );
  //                                                                                  </editor-fold>
};

Notifications.displayName = 'Notifications';


export { Notifications };
