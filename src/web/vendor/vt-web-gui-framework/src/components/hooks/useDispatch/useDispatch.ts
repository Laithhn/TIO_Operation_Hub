import { useDispatch as useOrigDispatch } from 'react-redux';

import type { RootDispatch } from 'store';


export const useDispatch = useOrigDispatch.withTypes<RootDispatch>();
