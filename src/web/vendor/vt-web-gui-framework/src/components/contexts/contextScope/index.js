import { createContext } from 'react';


/**
 * @typedef {object} ContextScopeData
 * @property {boolean} isScopeModwin - True if the content is loaded into a modal window or false if
 *   not.
 * @property {boolean} isScopeSecondSidebar - True if the content is loaded into the second sidebar
 *   or false if not.
 * @property {string} callerId - The ID of calling additional URL path, menu node or the UUID of the
 *   modal window.
 * @property {object} contentData - Optional key-value-data.
 * @property {boolean} isContentRestored - True, if the content was restored by navigation.
 *
 * @see {@link https://chow.vitronic.de/fordevs/contents}
 */

/**
 *
 * @type {React.Context<ContextScopeData>}
 */
const ContextScope = createContext({
  isScopeModwin: false,
  isScopeSecondSidebar: false,
  callerId: '',
  contentData: {},
  isContentRestored: false,
});

export default ContextScope;
