// react-redux stand-in for the vendored framework files: selectors read the static store shim; dispatch is a no-op.
import { state } from './store';

export const useSelector = (selector) => selector(state);
export const useDispatch = () => () => {};
