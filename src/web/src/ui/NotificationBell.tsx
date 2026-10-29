import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { get } from '../api';
import { Icon } from './Icon';
import { LoadBoundary } from './LoadBoundary';

// UX-003: the pop-up and the notifications center are one lazy chunk; pointing at or focusing the bell starts loading it early.
const loadPopover = () => import('../pages/Notifications');
const NotificationPopover = lazy(() => loadPopover().then(m => ({ default: m.NotificationPopover })));

/** Header bell: unread count (checked every minute); the pop-up lists the notices by severity. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const count = useQuery({ queryKey: ['notifications', 'count'], queryFn: () => get<{ count: number }>('/notifications/unread-count'), refetchInterval: 60_000, refetchOnWindowFocus: true });
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('mousedown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  const n = count.data?.count ?? 0;
  const preload = () => { void loadPopover().catch(() => undefined); };
  return (
    <div className="bell" ref={root}>
      <button ref={btn} className="hdr-btn bell-btn" onClick={() => setOpen(o => !o)} onPointerEnter={preload} onFocus={preload} aria-haspopup="dialog" aria-expanded={open} aria-label={n ? `Notifications, ${n} unread` : 'Notifications'} title="Notifications">
        <Icon name="bell" size={18} />{n > 0 && <span className="bell-count" aria-hidden="true">{n > 99 ? '99+' : n}</span>}
      </button>
      {open && (
        <LoadBoundary className="bell-pop">
          <Suspense fallback={<div className="bell-pop ntf-pop" role="dialog" aria-label="Notifications" aria-busy="true"><div className="state-msg"><span className="spin" /> Loading…</div></div>}>
            <NotificationPopover onClose={() => setOpen(false)} />
          </Suspense>
        </LoadBoundary>
      )}
    </div>
  );
}
