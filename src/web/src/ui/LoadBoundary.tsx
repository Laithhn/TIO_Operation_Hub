import { Component, type ReactNode } from 'react';

/**
 * UX-003: pages and the notification pop-up load as separate chunks. When a chunk cannot be fetched (connection lost, or a new release
 * replaced the files since this tab was opened) or a page fails while rendering, this shows a recoverable message in place of that
 * part only; the shell and its navigation stay usable. `resetKey` (the route) clears the error when the user navigates elsewhere.
 */
export class LoadBoundary extends Component<{ children: ReactNode; resetKey?: string; className?: string }, { error: unknown; key?: string }> {
  state: { error: unknown; key?: string } = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: unknown) { return { error }; }

  static getDerivedStateFromProps(p: { resetKey?: string }, s: { error: unknown; key?: string }) {
    return p.resetKey !== s.key ? { error: null, key: p.resetKey } : null;
  }

  render() {
    if (!this.state.error) return this.props.children;
    const chunk = isChunkError(this.state.error);
    const text = chunk
      ? 'This part of the application could not be downloaded. Check the connection; if the hub was updated since this page was opened, reloading fetches the new version.'
      : 'This page stopped because of an unexpected error. Reloading usually recovers; if it happens again, note the page and the time for the hub administrator.';
    return (
      <div className={`state-msg load-error ${this.props.className ?? ''}`} role="alert">
        <span>{text}</span>
        <span className="load-error-actions">
          <button type="button" className="btn" onClick={() => location.reload()}>Reload</button>
          {!chunk && <button type="button" className="linkbtn" onClick={() => this.setState({ error: null })}>Try again</button>}
        </span>
      </div>
    );
  }
}

/** Browsers word a failed dynamic import differently (Chromium, Firefox, Safari); Vite's preload helper adds its own. */
export const isChunkError = (e: unknown) =>
  e instanceof Error && /dynamically imported module|Importing a module script failed|error loading dynamically|Unable to preload CSS|Failed to fetch/i.test(e.message);
