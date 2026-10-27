import type { LogEntry } from 'store/store.types';

import type { MenuNode, MenuNodeId, MenuNodeOptions } from '../menus.types';


export interface PrimaryMenuNode extends MenuNode {
  /** True, if the primary menu node is selected as a startpage. */
  isStartpage: boolean;
  /** The path of the URL to select this primary menu node. It always starts with a leading slash
   * and has no trailing slash. */
  urlPath: string;
  /** An optional object with options of the primary menu node. */
  options: MenuNodeOptions;
}


export interface PrimaryMenuState {
  menuNodes: {
    /** Object with the data objects of all primary menu nodes. The keys are the IDs of the primary
     * menu nodes. */
    byId: Record<MenuNodeId, PrimaryMenuNode>;
    /** The IDs of all primary menu nodes. */
    allIds: MenuNodeId[];
  };
  /** What is to do, if a given URL ist invalid (can not be found at any primary menu node):
   * "_startpage" (default) to show the content of a menu node marked as startpage, "_blank" to
   * show no content, "_error" to show an error content or a content path to show this one. */
  behaviorAtInvalidUrl: string;
  /** The menu node ID of the currently active content. */
  activeId: MenuNodeId;
  /** An array of log entries occured in the menus/primaryMenu reducer. */
  logs: LogEntry[];
}
