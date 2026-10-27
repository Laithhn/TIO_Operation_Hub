// The VtWebGuiFramework 4 frame (header, primary menu nodes, first sidebar, main toolbar slot, footer), rendered by the
// hub. The framework's own App reads menus from its store and config.xml; the hub's navigation is permission-driven,
// so the same DOM structure is rendered here with the frame's own stylesheets (CSS modules). The two markers are the
// framework's components themselves: the glass lens under the active primary node and the glass drop beside the
// active first-sidebar node.
import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import * as appCss from '@vt/app/app.scss';
import * as headerCss from '@vt/app/modules/header/header.scss';
import * as logoCss from '@vt/app/modules/header/headerLogo/headerLogo.scss';
import * as primaryHeaderCss from '@vt/app/modules/header/primaryHeader/primaryHeader.scss';
import * as menuNodesCss from '@vt/app/modules/header/primaryHeader/menuNodes/menuNodes.scss';
import * as primaryNodeCss from '@vt/app/modules/header/primaryHeader/menuNodes/menuNode/menuNode.scss';
import * as secondaryHeaderCss from '@vt/app/modules/header/secondaryHeader/secondaryHeader.scss';
import * as secondaryNodeCss from '@vt/app/modules/header/secondaryHeader/menuNode/menuNode.scss';
import * as firstSidebarCss from '@vt/app/modules/firstSidebar/firstSidebar.scss';
import * as sidebarTitleCss from '@vt/app/modules/firstSidebar/title/title.scss';
import * as sidebarMenuCss from '@vt/app/modules/firstSidebar/menu/menu.scss';
import * as sidebarNodeCss from '@vt/app/modules/firstSidebar/menu/menuNode/menuNode.scss';
import * as footerCss from '@vt/app/modules/footer/footer.scss';
import * as mainScopeCss from '@vt/app/modules/mainScope/mainScope.scss';
import { Marker as PrimaryMarker } from '@vt/app/modules/header/primaryHeader/menuNodes/marker/Marker';
import { Marker as SidebarMarkerShape } from '@vt/app/modules/firstSidebar/marker/Marker';

export const frameCss = {
  app: appCss, header: headerCss, logo: logoCss, primaryHeader: primaryHeaderCss, menuNodes: menuNodesCss, primaryNode: primaryNodeCss,
  secondaryHeader: secondaryHeaderCss, secondaryNode: secondaryNodeCss, firstSidebar: firstSidebarCss, sidebarTitle: sidebarTitleCss,
  sidebarMenu: sidebarMenuCss, sidebarNode: sidebarNodeCss, footer: footerCss, mainScope: mainScopeCss
};

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

function useMeasure<T>(container: RefObject<HTMLElement | null>, key: unknown, read: (el: HTMLElement) => T | null) {
  const [v, setV] = useState<T | null>(null);
  // Passive effect: a child's layout effect runs before the parent's ref is attached.
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const measure = () => setV(read(el));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [container, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

/** The framework's glass lens under the active primary menu node. */
export function PrimaryLinksMarker({ container, activeKey }: { container: RefObject<HTMLElement | null>; activeKey?: string }) {
  const dims = useMeasure(container, activeKey, el => {
    const a = el.querySelector<HTMLElement>('[aria-current="page"]');
    return a ? { x: a.offsetLeft, w: a.offsetWidth } : null;
  });
  if (!dims || !activeKey) return null;
  return <PrimaryMarker posX={dims.x} width={dims.w} menuNodeId={activeKey} dynamicEffect />;
}

/** The framework's glass drop beside the active first-sidebar menu node. */
export function SidebarMarker({ container, path }: { container: RefObject<HTMLElement | null>; path: string }) {
  const y = useMeasure(container, path, el => {
    const all = [...el.querySelectorAll<HTMLElement>('a[aria-current="page"]')];
    const a = all[all.length - 1];
    return a ? a.offsetTop + a.offsetHeight / 2 : null;
  });
  if (y === null) return null;
  return <SidebarMarkerShape centerPosY={y} />;
}

export function SidebarTitle({ children }: { children: ReactNode }) {
  return <div className={sidebarTitleCss.title}><p>{children}</p></div>;
}
