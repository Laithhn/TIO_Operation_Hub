import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { get } from '../api';
import './ClientLogo.css';

/**
 * A71 (client logo brief, 28 Oct 2026): one component for a client's logo everywhere a client is shown.
 * - The logo address comes from the record (`logoUrl`) or from one shared lookup of every visible client's logo (`/clients/logos`),
 *   so lists, dashboards and reports never ask per client.
 * - Fixed square box per size (no layout shift); the image is contained, never stretched or cropped.
 * - Initials on a coloured tile while loading, without a logo, or when the file fails: never a broken image.
 */
export type LogoSize = 'xs' | 'sm' | 'md' | 'lg';
export const LOGO_PX: Record<LogoSize, number> = { xs: 18, sm: 26, md: 48, lg: 96 };

type LogoEntry = { id: number; code: string; logoUrl: string };

/** Every visible client that has a logo: id → address. One request, shared by all screens, refreshed after a save (useRefresh). */
export function useClientLogos(enabled = true): Map<number, string> {
  const q = useQuery({ queryKey: ['client-logos'], queryFn: () => get<LogoEntry[]>('/clients/logos'), staleTime: 5 * 60_000, enabled });
  return useMemo(() => new Map((q.data ?? []).map(x => [x.id, x.logoUrl])), [q.data]);
}

/** Up to two letters: the first letters of the first two words of the name, otherwise of the alias. */
export function initialsOf(name?: string | null, code?: string | null): string {
  const words = (name ?? '').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const one = words[0] ?? (code ?? '').replace(/[^\p{L}\p{N}]/gu, '');
  return one.slice(0, 2).toUpperCase() || '?';
}

// Background tones for the initials; every one keeps white text above 4.5:1 contrast.
const TONES = ['#001e46', '#0b5394', '#1d6b5f', '#6a3d9a', '#8a4b08', '#7a2e3f', '#3b5563', '#2f5d1e'];

/** A stable tone per client, so the same client always gets the same colour. */
export function toneOf(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return TONES[h % TONES.length];
}

export function ClientLogo({ clientId, name, code, logoUrl, size = 'sm', decorative, className }: {
  clientId?: number | null; name?: string | null; code?: string | null; logoUrl?: string | null; size?: LogoSize;
  /** True when the client's name is written right beside the logo: the logo is then hidden from screen readers (no double reading). */
  decorative?: boolean; className?: string;
}) {
  const known = logoUrl !== undefined;
  const map = useClientLogos(!known && clientId != null);
  const url = known ? logoUrl : clientId != null ? map.get(clientId) : undefined;
  const [failed, setFailed] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const label = name || code || 'client';
  const showImg = !!url && failed !== url;
  const px = LOGO_PX[size];
  return (
    <span className={`client-logo cl-${size}${showImg && loaded === url ? ' has-img' : ''}${className ? ' ' + className : ''}`} style={{ width: px, height: px }}
      role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : showImg ? `${label} logo` : label} aria-hidden={decorative || undefined}
      data-client-logo={showImg ? 'image' : 'initials'} title={decorative ? undefined : label}>
      {/* Initials are drawn by CSS (attr), so they never become part of the page text, copied text or the accessible name. */}
      <span className="cl-initials" style={{ background: toneOf(code || name || '?') }} data-initials={initialsOf(name, code)} aria-hidden="true" />
      {showImg && <img src={url!} alt="" loading="lazy" decoding="async" width={px} height={px} draggable={false}
        onLoad={() => setLoaded(url!)} onError={() => setFailed(url!)} />}
    </span>
  );
}

/**
 * A client as shown in lists, cards, pickers and reports: logo plus alias and/or name, linked to the client page unless `link={false}`.
 * The logo is decorative here because the name is written beside it.
 */
type DisplayProps = {
  id?: number | null; code?: string | null; name?: string | null; logoUrl?: string | null; size?: LogoSize;
  show?: 'code' | 'name' | 'both'; link?: boolean; sub?: ReactNode; className?: string;
};
const displayText = ({ code, name, show = 'code' }: DisplayProps) => (show === 'name' ? (name || code) : show === 'both' ? [code, name].filter(Boolean).join(' · ') : (code || name)) ?? '';

export function ClientDisplay({ id, code, name, logoUrl, size = 'sm', show = 'code', link = true, sub, className }: DisplayProps) {
  const text = displayText({ code, name, show });
  const label = link && id != null ? <Link to={`/clients/${id}`}>{text}</Link> : <span>{text}</span>;
  return (
    <span className={`client-display cd-${size}${className ? ' ' + className : ''}`}>
      <ClientLogo clientId={id} code={code} name={name} logoUrl={logoUrl} size={size} decorative />
      <span className="cd-text">{label}{sub && <span className="cd-sub">{sub}</span>}</span>
    </span>
  );
}

export type LogoRules = { maxFileKB: number; maxPixels: number; extensions: string[] };

/** A71: checks a chosen file before upload (the server checks the content again); returns the problem, or null. */
export function logoProblem(file: { name: string; size: number; type: string }, rules?: LogoRules): string | null {
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '';
  if (ext === '.svg' || file.type === 'image/svg+xml') return 'SVG logos are not accepted: an SVG file can contain scripts and the hub cannot clean it safely. Save the logo as PNG or WebP.';
  const allowed = rules?.extensions ?? ['.png', '.jpg', '.jpeg', '.webp'];
  if (!allowed.includes(ext)) return `${ext ? ext + ' files' : 'Files without an extension'} are not accepted. Choose a PNG, JPG, JPEG or WebP image.`;
  const max = (rules?.maxFileKB ?? 2048) * 1024;
  if (file.size === 0) return 'The file is empty.';
  if (file.size > max) return `The logo is larger than ${max % (1024 * 1024) === 0 ? `${max / 1024 / 1024} MB` : `${max / 1024} KB`}. Choose a smaller file.`;
  return null;
}

/** The text a table uses to filter, sort and export a client cell (ui/kit nodeText): the alias and/or name, plus the line below. */
ClientDisplay.plainText = (p: DisplayProps) => [displayText(p), typeof p.sub === 'string' ? p.sub : ''].filter(Boolean).join(' ');
/** A logo alone has no text of its own in a table cell. */
ClientLogo.plainText = () => '';
