import type { ContentData } from 'app/modules/content';


export interface Modwin {
  /** The UUID of the modal window. */
  id: string;
  /** True, if the content of the modal window is just loading. */
  isLoading: boolean;
  /** The path to the content that has to be loaded into the modal window. */
  contentPath: string;
  /** An optional data object to use in the content of the modal window. */
  contentData: ContentData;
  /** A title to show in the header of the modal window. */
  title: string;
  /** The initial width of the modal window. If 0, the full width is taken. */
  width: number;
  /** The initial height of the modal window. If 0, the full height is taken. */
  height: number;
  /** True, if the modal window is minimized. */
  isMinimized: boolean;
  /** True, if the modal window is draggable by mouse or touch. */
  isDraggable: boolean;
  /** True, if the modal window is resizable in width and height. */
  isResizable: boolean;
  /** True, if the modal window is minimizable by clicking an icon in the header. */
  isMinimizable: boolean;
  /** True, if closing the modal window by clicking the X-icon in the toolbar or by pressing Escape
   * is forbidden. In this case it can only be closed by action creators deleteModwin or
   * deleteAllModwins from inside or outside of the modal windows. */
  isUnclosable: boolean;
  /** True, if closing the modal window by pressing the key Escape is enabled. Only available, if
   * unclosable is false. */
  closeByEscape: boolean;
  /** True, if the modal windows with the same content pathes can be opened multiple times. If it is
   * a string or number (multiple-ID), only these modal windows with the same content pathes can be
   * opened multiple times, that have different multiple-IDs. */
  multiple: boolean | string | number;
  /** True, to block all other contents and modal windows except of this one. */
  isExclusive: boolean;
  /** True and if it is exclusive, to show a dimmed background behind the modal window. */
  dimmedBackground: boolean;
}


export interface ModwinsState {
  /** Object with the data objects of all modal windows. The key is the UUID of the modal
   * windows. */
  byId: Record<string, Modwin>;
  /** The UUIDs of all modal windows (minimized or not). */
  allIds: string[];
  /** The UUIDs of the minimized modal windows. */
  allMiniIds: string[];
}
