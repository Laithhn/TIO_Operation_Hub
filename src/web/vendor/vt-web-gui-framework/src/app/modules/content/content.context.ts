import { createContext } from 'react';

import type { ContentContextData } from './content.types';


/**
 * The React context of the app module "Content".
 */
export const ContentContext = createContext<ContentContextData>({
  isScopeModwin: false,
  isScopeSecondSidebar: false,
  callerId: '',
  contentData: {},
  isContentRestored: false,
});
