import type { MenuNodeId } from '../menus.types';


/**
 * Helper function to parse the given ID of a menu node. It is checked that the ID is a not empty
 * string. Whitespaces are removed. If the ID is invalid, null is returned.
 */
export const parseMenuNodeId = (id: unknown): MenuNodeId | null => {
  if (typeof id === 'string') {
    const parsedId: MenuNodeId = id.replace(/\s/g, ''); // whitespaces are not allowed in the id

    if (parsedId !== '') {
      return parsedId;
    }
  }

  return null;
};
