import type { StorageType } from 'interfaces/storageItf';


export interface SecondSidebarState {
  /** True, if the second sidebar is initialized and ready to use. */
  isReady: boolean;
  /** The width of the second sidebar in pixels. */
  width: number;
  /** True, if the second sidebar is minimizable by the user or false if not. */
  isMinimizable: boolean;
  /** True, if the second sidebar is minimizable and minimized at the moment or false if not. */
  isMinimized: boolean;
  /** True, if the second sidebar is resizable by the user. */
  isResizable: boolean;
  /** The storage type to store some data of the second sidebar. */
  storageType: StorageType;
  /** Data of the content area of the second sidebar. */
  content: {
    /** The path to the content file to show in the second sidebar. It is an empty string, if there
     * is no content to show. */
    path: string;
  };
}


export interface SecondSidebarProps {
  onChange: ({ width, isMinimized }: { width: number; isMinimized: boolean }) => void;
}
