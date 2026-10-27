import type { LogEntry } from 'store/store.types';

import type {
  ContentScope, MenuNode, MenuNodeId, MenuNodeOptions,
} from '../menus.types';


export interface SecondaryMenuNode extends MenuNode {
  /** True, if the secondary menu node is a special one, like the language select box. Special menu
   * nodes can only be 1st level menu nodes. */
  isSpecialMenuNode: boolean;
  /** The scope for the content of the secondary menu node. It can by "MODWIN", "JS" or "BLANK". */
  scope: ContentScope;
  /** 1st level of secondary menu nodes only. True to always show this menu node in the default way,
   * independent of the appearance of the menus. */
  ignoreAppearance: boolean;
  /** An optional object with options of the secondary menu node. */
  options: MenuNodeOptions & {
    /** Optional option for secondary menu nodes, if the scope is a modal window: a title to show in
     * the header of the modal window. */
    modwinTitle?: string;
    /** Optional option for secondary menu nodes, if the scope is a modal window: the initial width
     * of the modal window. If 0, the full width is taken. */
    modwinWidth?: number;
    /** Optional option for secondary menu nodes, if the scope is a modal window: the initial height
     * of the modal window. If 0, the full height is taken. */
    modwinHeight?: number;
    /** Optional option for secondary menu nodes, if the scope is a modal window: true, if the modal
     * window is draggable by mouse or touch. */
    modwinIsDraggable?: boolean;
    /** Optional option for secondary menu nodes, if the scope is a modal window: true, if the modal
     * window is resizable in width and height. */
    modwinIsResizable?: boolean;
    /** Optional option for secondary menu nodes, if the scope is a modal window: true, if the modal
     * window is minimizable by clicking an icon in the header. */
    modwinIsMinimizable?: boolean;
    /** Optional option for secondary menu nodes, if the scope is a modal window: true, if closing
     * the modal window by clicking the X-icon in the toolbar or by pressing Escape is forbidden. */
    modwinIsUnclosable?: boolean;
    /** Optional option for secondary menu nodes, if the scope is a modal window: true, if closing
     * the modal window by pressing the key Escape is enabled. Only available, if option
     * "modwinIsUnclosable" is false. */
    modwinCloseByEscape?: boolean;
    /** Optional option for secondary menu nodes, if the scope is a modal window: true, if modal
     * windows with the same content pathes can be opened multiple times. If it is a string
     * (multiple-ID), only these modal windows with the same content pathes can be opened multiple
     * times, that have different multiple-IDs. */
    modwinMultiple?: boolean | string;
    /** Optional option for secondary menu nodes, if the scope is a modal window: true, to block all
     * other contents and modal windows except of this one. */
    modwinIsExclusive?: boolean;
    /** Optional option for secondary menu nodes, if the scope is a modal window: true and if it is
     * exclusive, to show a dimmed background behind the modal window. */
    modwinDimmedBackground?: boolean;
  };
}


export interface SecondaryMenuState {
  menuNodes: {
    /** Object with the data objects of all secondary menu nodes. The keys are the IDs of the
     * secondary menu nodes. */
    byId: Record<MenuNodeId, SecondaryMenuNode>;
    /** The IDs of all secondary menu nodes. */
    allIds: MenuNodeId[];
  };
  /** An array of log entries occured in the menus/secondaryMenu reducer. */
  logs: LogEntry[];
}
