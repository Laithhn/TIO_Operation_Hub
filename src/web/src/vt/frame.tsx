// The VtWebGuiFramework frame (header, primary links, first sidebar, main toolbar slot, footer), rendered by the hub.
// The framework's own frame components read menus from its Redux store and config.xml; the hub's navigation is
// permission-driven, so the same DOM structure is rendered here with the frame's own stylesheets (CSS modules).
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import appCss from '@vt/frame/app/app.scss';
import headerCss from '@vt/frame/header/header.scss';
import logoCss from '@vt/frame/header/logo/logo.scss';
import primaryHeaderCss from '@vt/frame/header/primaryHeader/primaryHeader.scss';
import primaryLinksCss from '@vt/frame/header/primaryHeader/primaryLinks/primaryLinks.scss';
import primaryLinkCss from '@vt/frame/header/primaryHeader/primaryLinks/primaryLink/primaryLink.scss';
import primaryMarkerCss from '@vt/frame/header/primaryHeader/primaryLinks/marker/marker.scss';
import secondaryHeaderCss from '@vt/frame/header/secondaryHeader/secondaryHeader.scss';
import secondaryLinkCss from '@vt/frame/header/secondaryHeader/secondaryLink/secondaryLink.scss';
import firstSidebarCss from '@vt/frame/sidebars/firstSidebar/firstSidebar.scss';
import sidebarTitleCss from '@vt/frame/sidebars/firstSidebar/title/title.scss';
import primarySubmenuCss from '@vt/frame/sidebars/firstSidebar/primarySubmenu/primarySubmenu.scss';
import entryCss from '@vt/frame/sidebars/firstSidebar/primarySubmenu/entry/entry.scss';
import sidebarMarkerCss from '@vt/frame/sidebars/firstSidebar/marker/marker.scss';
import footerCss from '@vt/frame/footer/footer.scss';
import mainScopeCss from '@vt/frame/mainScope/mainScope.scss';
import mainToolbarCss from '@vt/components/layouts/mainToolbar/mainToolbar.scss';
import mainToolbarTitleCss from '@vt/components/layouts/mainToolbar/title/title.scss';
import { defines } from './index';

export const frameCss = {
  app: appCss, header: headerCss, logo: logoCss, primaryHeader: primaryHeaderCss, primaryLinks: primaryLinksCss, primaryLink: primaryLinkCss,
  secondaryHeader: secondaryHeaderCss, secondaryLink: secondaryLinkCss, firstSidebar: firstSidebarCss, sidebarTitle: sidebarTitleCss,
  primarySubmenu: primarySubmenuCss, entry: entryCss, footer: footerCss, mainScope: mainScopeCss, mainToolbar: mainToolbarCss,
  mainToolbarTitle: mainToolbarTitleCss
};

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** The light block under the active primary link (frame/header/primaryHeader/primaryLinks/marker). */
export function PrimaryLinksMarker({ container, activeKey }: { container: RefObject<HTMLElement | null>; activeKey?: string }) {
  const [dims, setDims] = useState<{ x: number; w: number; key?: string } | null>(null);
  const prev = useRef<string | undefined>(undefined);
  // Passive effect: a child's layout effect runs before the parent's ref is attached.
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const measure = () => {
      const a = el.querySelector<HTMLElement>('[aria-current="page"]');
      setDims(a ? { x: a.offsetLeft, w: a.offsetWidth, key: activeKey } : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [container, activeKey]);
  const animate = !!prev.current && prev.current !== dims?.key;
  prev.current = dims?.key;
  if (!dims) return null;
  return <div aria-hidden="true" className={cx(primaryMarkerCss.marker, animate && primaryMarkerCss.enableAnimation)}
    style={{ width: `${dims.w}px`, transform: `translateX(${dims.x}px)`, backgroundColor: defines.layout.mainToolbar.background }} />;
}

// Geometry of frame/sidebars/firstSidebar/marker (24 × 50 SVG, half of it outside the sidebar).
const MARKER_BG = 'M11.5,0C11.5,6 8.36,9.767 6,13 3.64,16.233 0.5,20 0.5,25 0.5,30 3.546,33.874 6,37 8.454,40.126 11.5,44 11.5,50H12V0Z';
const MARKER_LINE = 'M11.5,0C11.5,6 8.36,9.767 6,13 3.64,16.233 0.5,20 0.5,25 0.5,30 3.546,33.874 6,37 8.454,40.126 11.5,44 11.5,50';

/** The bulge with a dot that marks the active first-sidebar entry. */
export function SidebarMarker({ container, path }: { container: RefObject<HTMLElement | null>; path: string }) {
  const [y, setY] = useState<number | null>(null);
  // Passive effect: a child's layout effect runs before the parent's ref is attached.
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const measure = () => {
      const all = [...el.querySelectorAll<HTMLElement>('a[aria-current="page"]')];
      const a = all[all.length - 1];
      setY(a ? a.offsetTop + a.offsetHeight / 2 : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [container, path]);
  if (y === null) return null;
  return (
    <span aria-hidden="true" className={sidebarMarkerCss.marker} style={{ transform: `translateY(${y}px)`, transition: `transform ${defines.system.contentChangeFadeOutTimeMs}ms ease-in-out` }}>
      <svg width="24px" height="50px" viewBox="0 0 24 50">
        <path style={{ fill: defines.layout.dashboard.background }} d={MARKER_BG} />
        <path className={sidebarMarkerCss.line} d={MARKER_LINE} />
        <circle className={sidebarMarkerCss.circle} cx={8} cy={25} r={4} />
      </svg>
    </span>
  );
}

export function SidebarTitle({ children }: { children: ReactNode }) {
  return <div className={sidebarTitleCss.title}><p>{children}</p></div>;
}
