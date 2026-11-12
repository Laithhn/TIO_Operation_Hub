import type { RootStore } from 'store';
import type { MenuNodeId, MenuNodeOptions } from 'store/menus/secondaryMenu';


/** Enumeration for the type of the content loaded into the main scope or into a modal window. */
export type ContentType = 'none' | 'dashboard' | 'article' | 'iframe' | 'error';


/** The type of data passing into a content, usually from the caller. */
export type ContentData = Record<string, string | number | boolean | null> | null;


/** The type of the React context of the app module "Content". */
export interface ContentContextData {
  /** True if the content is loaded into a modal window or false if not. */
  isScopeModwin: Required<ContentProps>['isScopeModwin'];
  /** True if the content is loaded into the second sidebar content area or false if not. */
  isScopeSecondSidebar: boolean;
  /** The ID of the caller, can be an additional URL path or an ID of a menu node or a UUID of a
   * modal window. */
  callerId: Required<ContentProps>['callerId'];
  /** Optional data for the content as key-value pairs. */
  contentData: Required<ContentProps>['contentData'];
  /** True, if the content was restored by the navigation (e.g. by pressing F5 at the browser). */
  isContentRestored: Required<ContentProps>['isContentRestored'];
}


export type JsContentFunc = ({
  dispatch, getState, subscribe, calledId, contentData,
}: (Pick<RootStore, 'dispatch' | 'getState' | 'subscribe'> & {
  calledId: MenuNodeId;
  contentData: MenuNodeOptions;
})) => void;


export type ContentHandle = HTMLElement | {
  beforeUnload?: (id: string) => boolean;
};


/** The Redux state of the slice of the app module "Content". */
export interface ContentProps {
  readonly ref?: React.Ref<ContentHandle | null>;
  /** The path to the content to load. Can be a URL beginning with "http://" or "https://". It can
   * also be a relative path to a file inside the content folder with leading slash, file name
   * "content" and file extension "jsx" or "tsx". For internal use, it can also be an app module
   * having a file "content.tsx". In this case, contentPath must only be the name of the module with
   * leading "viwgf" .*/
  readonly contentPath: string;
  /** Optionally true if the content is loaded into a modal window or false if not. Default:
   * false. */
  readonly isScopeModwin?: boolean;
  /** The optional ID of the caller, can be an additional URL path or an ID of a menu node or a UUID
   * of a modal window. Default: an empty string. */
  readonly callerId?: string;
  /** Optional data for the content as key-value pairs. */
  readonly contentData?: ContentData;
  /** Optionally true, if the content was restored by the navigation (e.g. by pressing F5 at the
   * browser). Default: false. */
  readonly isContentRestored?: boolean;
  readonly onStartLoading?: (callerId: string) => void;
  readonly onFinishLoading?: (contentType: ContentType) => void;
  readonly onDestruct?: () => void;
}


export interface ContentReducerState {
  /** The path to the content to load. Can be a URL beginning with "http://" or "https://". It can
   * also be a relative path to a file inside the content folder with leading slash, file name
   * "content" and file extension "jsx" or "tsx". For internal use, it can also be an app module
   * having a file "content.tsx". In this case, contentPath must only be the name of the module with
   * leading "viwgf" .*/
  contentPath: Required<ContentProps>['contentPath'];
  /** The determined type of the content. */
  contentType: ContentType;
  /** True if the content is loaded into a modal window or false if not. */
  isScopeModwin: Required<ContentProps>['isScopeModwin'];
  /** The ID of the caller, can be an additional URL path or an ID of a menu node or a UUID of a
   * modal window. */
  callerId: Required<ContentProps>['callerId'];
  /** Optional data for the content as key-value pairs. */
  contentData: Required<ContentProps>['contentData'];
  /** True, if the content was restored by the navigation (e.g. by pressing F5 at the browser). */
  isContentRestored: Required<ContentProps>['isContentRestored'];
  /** The dynamically loaded React component or null if the content path is a URL. */
  content: { default: React.ComponentType } | null;
  error: string;
}


export type ContentReducerActions
  = | { type: 'SET_CONTENT'; payload: Pick<ContentReducerState, 'contentPath' | 'contentType' | 'isScopeModwin' | 'callerId' | 'contentData' | 'isContentRestored' | 'content'> }
    | { type: 'SET_CONTENT_ERROR'; payload: Pick<ContentReducerState, 'contentPath' | 'isScopeModwin' | 'callerId' | 'error'> };
