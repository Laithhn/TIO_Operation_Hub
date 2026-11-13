// Icons come from VtWebGuiIcons 2.4.0 (vendor/vt-web-gui-icons): single-path 24×24 glyphs, filled, as in the framework.
// The hub's semantic names map onto framework icon names; unknown names may also be framework names directly.
import { getIconPath, iconExists, iconViewbox, logoSvg } from '../vt';

const MAP: Record<string, string> = {
  dashboard: 'DASHBOARD', clients: 'COMPANY', region: 'GEOLOCATION', project: 'BRIEFCASE', server: 'DATABASE', app: 'PACKAGE',
  matrix: 'TABLE', network: 'HIERARCHY', case: 'SUPPORT', commitment: 'GOAL', team: 'USERGROUP', handover: 'SHARE',
  quality: 'QUALITY', report: 'BARCHART', admin: 'SETTINGS', users: 'GROUP', list: 'LIST', history: 'HISTORY', archive: 'ACHIVE',
  plus: 'ADD', search: 'SEARCH', escalation: 'ALERT', note: 'NOTEBOOK', user: 'USER', chevron: 'NAVILEFT',
  down: 'NAVIDOWN', menu: 'BURGERMENU', close: 'CLOSE', online: 'CLOUDCONNECTED', download: 'EXPORT', signout: 'LOGOUT',
  lock: 'LOCK', key: 'KEY', storage: 'DATABASEINFO', map: 'MAP', filter: 'FILTER', calendar: 'CALENDAR', warning: 'WARNING',
  error: 'ERROR', ok: 'OK', info: 'INFO', edit: 'EDIT', delete: 'TRASH', copy: 'COPY', excel: 'EXCEL', attachment: 'ATTACHEMENT', payment: 'MONEY'
};

/** The framework has no plain bell, only an alarm glyph, so notifications use this outline of the hub's own (owner request). */
const BELL_OUTLINE = 'M12 4C8.6 4 6 6.4 5.5 9.4L4.6 15C4.4 16.1 3.9 16.6 3.2 17.1C2.2 17.8 2.6 19 3.7 19H20.3C21.4 19 21.8 17.8 20.8 17.1C20.1 16.6 19.6 16.1 19.4 15L18.5 9.4C18 6.4 15.4 4 12 4ZM10.3 4.2V3.4A1.7 1.7 0 0 1 13.7 3.4V4.2M9 19A3 3 0 0 0 15 19';

export const iconPath = (name: string): string | undefined => {
  const key = MAP[name] ?? name.toUpperCase();
  return iconExists(key) ? getIconPath(key) : getIconPath('LIST');
};

export function Icon({ name, size = 18, title }: { name: string; size?: number; title?: string }) {
  return (
    <svg className="ic" width={size} height={size} viewBox={iconViewbox} fill="currentColor"
      aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      {name === 'bell'
        ? <path d={BELL_OUTLINE} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        : <path d={iconPath(name)} />}
    </svg>
  );
}

/** The VITRONIC word mark shipped with the framework (src/assets/images/logoVitronic.svg). */
export function Logo() {
  return <span className="vt-logo" aria-hidden="true" dangerouslySetInnerHTML={{ __html: logoSvg }} />;
}
