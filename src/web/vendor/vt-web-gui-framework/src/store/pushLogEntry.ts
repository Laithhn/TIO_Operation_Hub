import type { LogEntry } from './store.types';


/** The number of entries the log of a slice keeps at most. Beyond it, the oldest entries go. */
export const maxLogEntries = 200;

/** The number of characters the text of a log entry keeps at most. A longer text is cut after it
 * and closes with its original length. */
export const maxLogTextLength = 1000;


/**
 * Function to append a given entry to a given log of a slice. The log is capped in two ways: a text
 * longer than maxLogTextLength is cut and closes with its original length, and once the log holds
 * more than maxLogEntries entries, the oldest ones go. Every entry of a log goes through here, or
 * the log of a long-running application grows without limit.
 */
export const pushLogEntry = (logs: LogEntry[], entry: LogEntry) => {
  const { text } = entry;

  logs.push({
    ...entry,
    text: (text.length > maxLogTextLength) ? `${text.slice(0, maxLogTextLength)}… (${text.length} characters)` : text,
  });

  if (logs.length > maxLogEntries) {
    logs.splice(0, logs.length - maxLogEntries);
  }
};
