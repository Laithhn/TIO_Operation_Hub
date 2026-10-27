// Icons come from VtWebGuiIcons 2.4.0 (vendor/vt-web-gui-icons): single-path 24×24 glyphs, filled, as in the framework.
// The hub's semantic names map onto framework icon names; unknown names may also be framework names directly.
import { getIconPath, iconExists, iconViewbox, logoSvg } from '../vt';

const MAP: Record<string, string> = {
  dashboard: 'DASHBOARD', clients: 'COMPANY', region: 'GEOLOCATION', project: 'BRIEFCASE', server: 'DATABASE', app: 'PACKAGE',
  matrix: 'TABLE', network: 'HIERARCHY', case: 'SUPPORT', commitment: 'GOAL', team: 'USERGROUP', handover: 'SHARE',
  quality: 'QUALITY', report: 'BARCHART', admin: 'SETTINGS', users: 'GROUP', list: 'LIST', history: 'HISTORY', archive: 'ACHIVE',
  plus: 'ADD', search: 'SEARCH', escalation: 'ALERT', note: 'NOTEBOOK', bell: 'ALARM', user: 'USER', chevron: 'NAVILEFT',
  down: 'NAVIDOWN', menu: 'BURGERMENU', close: 'CLOSE', online: 'CLOUDCONNECTED', download: 'EXPORT', signout: 'LOGOUT',
  lock: 'LOCK', key: 'KEY', storage: 'DATABASEINFO', map: 'MAP', filter: 'FILTER', calendar: 'CALENDAR', warning: 'WARNING',
  error: 'ERROR', ok: 'OK', info: 'INFO', edit: 'EDIT', delete: 'TRASH', copy: 'COPY', excel: 'EXCEL', attachment: 'ATTACHEMENT'
};

export const iconPath = (name: string): string | undefined => {
  const key = MAP[name] ?? name.toUpperCase();
  return iconExists(key) ? getIconPath(key) : getIconPath('LIST');
};

export function Icon({ name, size = 18, title }: { name: string; size?: number; title?: string }) {
  return (
    <svg className="ic" width={size} height={size} viewBox={iconViewbox} fill="currentColor"
      aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <path d={iconPath(name)} />
    </svg>
  );
}

/** The VITRONIC word mark shipped with the framework (src/assets/images/logoVitronic.svg). */
export function Logo() {
  return <span className="vt-logo" aria-hidden="true" dangerouslySetInnerHTML={{ __html: logoSvg }} />;
}
