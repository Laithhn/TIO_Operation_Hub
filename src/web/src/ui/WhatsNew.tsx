import { lazy, Suspense, useState } from 'react';

const Dialog = lazy(() => import('./WhatsNewDialog').then(m => ({ default: m.WhatsNewDialog })));
const SEEN = 'tiohub.whats-new.seen';
const seen = () => { try { return localStorage.getItem(SEEN); } catch { return null; } };

/** The footer's link to the latest changes; a dot marks a version this person has not opened yet. */
export function WhatsNewLink({ version }: { version: string }) {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState(seen);
  const show = () => {
    setOpen(true);
    setLast(version);
    try { localStorage.setItem(SEEN, version); } catch { /* private browsing: the dot returns next time */ }
  };
  return <>
    <button type="button" className="whats-new-link" onClick={show}>What's new{last !== version && <span className="dot" title="New since you last looked" />}</button>
    {open && <Suspense fallback={null}><Dialog version={version} onClose={() => setOpen(false)} /></Suspense>}
  </>;
}
