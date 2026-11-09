import { createContext } from 'react';

import type { InternalValuesContextData } from './dateTimePicker.types';


/**
 * The React context for the internal values of the control component "DateTimePicker": the hours on
 * the 12-hour cycle and the am/pm marker, which the parts and the time section hold between them
 * while the other half of a 12-hour time is not entered yet. The picker always provides it, so the
 * defaults below are never read; their setters do nothing rather than being absent, which spares
 * every consumer a test for them.
 */
export const InternalValuesContext = createContext<InternalValuesContextData>({
  internalHoursH12: null,
  setInternalHoursH12: () => undefined,
  internalAmPm: null,
  setInternalAmPm: () => undefined,
});
