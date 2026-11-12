import { useSelector } from 'components/hooks/useSelector';
import { i18nSlice } from 'store/i18n';


/**
 * Hook to simply use an i18n selector of the Redux store, that returns a memoized object with some
 * data and functions about internationalization.
 */
export const useI18n = () => useSelector(i18nSlice.selectTools);
