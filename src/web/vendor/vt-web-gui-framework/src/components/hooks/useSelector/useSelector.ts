import { useSelector as useOrigSelector } from 'react-redux';

import type { RootState } from 'store';


export const useSelector = useOrigSelector.withTypes<RootState>();
