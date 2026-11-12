import { WHATS_NEW } from '../whatsNew';
import { Dialog } from './kit';

export function WhatsNewDialog({ version, onClose }: { version: string; onClose: () => void }) {
  return (
    <Dialog title="What's new" onClose={onClose} wide>
      <div className="whats-new">
        {WHATS_NEW.map(r => <section key={r.version} aria-label={`Version ${r.version}`}>
          <h3>Version {r.version}{r.version === version && ' · running now'} <small className="hint">{r.date}</small></h3>
          <ol>{r.changes.map(c => <li key={c}>{c}</li>)}</ol>
        </section>)}
      </div>
    </Dialog>
  );
}
