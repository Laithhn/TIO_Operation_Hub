import { createContext } from 'react';

import { imageDataInitialArg } from './imageData.reducer';
import type { ImageDataContextData } from './imageData.types';


/**
 * The React context of the popup component "ImageViewer", carrying what the viewer has measured of
 * each of its images. The default below is never the value in use - the viewer always provides one
 * - it only spares every reader a check for an absent context.
 */
export const ImageDataContext = createContext<ImageDataContextData>({
  imageDataState: imageDataInitialArg,
  imageDataDispatch: () => undefined,
});
