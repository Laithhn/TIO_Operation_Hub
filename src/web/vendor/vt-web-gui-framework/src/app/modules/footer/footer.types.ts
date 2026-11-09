import type { LogEntry, SliceStatus } from 'store';


/** The Redux state of the slice of the app module "Footer". */
export interface FooterState {
  /** The current status of the slice. */
  status: SliceStatus;
  /** The path to the content file to show in the footer. It is an empty string, if there is no
   * content to show. If given, it must end with file name "content.jsx" or "content.tsx". */
  contentPath: string;
  /** An array of log entries occured in this slice. */
  logs: LogEntry[];
}
