import type { ContentData } from 'app/modules/content/content.types';
import type { LogEntry } from 'store/store.types';


export interface AdditionalUrlPath {
  /** The unique URL path with leading slash. */
  path: string;
  /** True if it is not allowed to use this URL path. */
  isDisabled: boolean;
  /** The path to the content associated with the additional URL path. It is either a relative path
   * in the content directory to show in the main scope or an URL of a web page to embed in an
   * iframe. */
  contentPath: string;
  /** Optional options that are passed to the content. */
  options: NonNullable<ContentData>;
}


export interface NavigationState {
  addUrlPathes: {
    /** Object of objects of the additional URL path entries. */
    byPath: Record<string, AdditionalUrlPath>;
    /** Array of all pathes of the existing additional URL path entries. */
    allPathes: string[];
  };
  /** Object with information about the URL query string. */
  urlQueries: {
    /** Either true to preserve the complete URL query string at navigation or false to not, or it
     * is an array of selected query keys in lower cases to preserve. Default: false. */
    preserve: boolean | string[];
  };
  /** An array of log entries occured in the navigation reducer. */
  logs: LogEntry[];
}
