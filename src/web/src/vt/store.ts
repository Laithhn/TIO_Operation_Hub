// The VtWebGuiFramework 4 Redux store, configured as the framework's own entry (src/index.tsx) does: from a
// configuration element, then waiting until the i18n and storage slices are ready. The hub keeps its own router and
// data layer; the configuration therefore declares only what the framework components read: one language (English,
// the framework's XML table served from /vt-i18n/en.xml) and local storage. Menus, sidebars and footer are rendered
// by the hub (ui/Shell.tsx) and stay unconfigured here.
import { i18nSlice } from '@vt/store/i18n';
import { storageSlice } from '@vt/store/storage';
import { configureReduxStore } from '@vt/store/store';
import * as appSlice from '@vt/app/app.slice';
import { getViewportDims } from '@vt/utils/getViewportDims';
import { throttle } from '@vt/utils/throttle';

const CONFIG = `<?xml version="1.0" encoding="UTF-8"?>
<Configuration>
  <Common><HeaderTitle>TIO Operations Hub</HeaderTitle></Common>
  <I18n storageType="local"><Language isDefault="true" format="xml">en</Language></I18n>
</Configuration>`;

export type VtStore = ReturnType<typeof configureReduxStore>;

/**
 * What the framework's own App component (app/App.tsx, effect 1) does at start: it keeps the viewport size in the store
 * (cards, menus and the image viewer place themselves against it) and dispatches the document event "domChange" on
 * every DOM mutation and resize (cards follow their anchor element by it). The hub renders its own frame, so it runs
 * this here once.
 */
function startFrameworkAppEffects(store: VtStore) {
  const dispatchViewport = throttle(() => { store.dispatch(appSlice.setViewportDimensions(getViewportDims())); }, 100);
  window.addEventListener('resize', dispatchViewport);
  dispatchViewport();
  const domChange = (detail?: MutationRecord[] | Event) => { document.dispatchEvent(new CustomEvent('domChange', { detail })); };
  new MutationObserver(domChange).observe(document, { childList: true, attributes: true, characterData: true, subtree: true });
  window.addEventListener('resize', domChange);
}

export function createVtStore(timeoutMs = 30_000): Promise<VtStore> {
  const xml = new DOMParser().parseFromString(CONFIG, 'application/xml').querySelector('Configuration');
  if (!xml) throw new Error('VtWebGuiFramework configuration could not be parsed.');
  const store = configureReduxStore(xml);
  return new Promise((resolve, reject) => {
    const ready = () => i18nSlice.selectIsReady(store.getState()) && storageSlice.selectIsReady(store.getState());
    const timer = setTimeout(() => { unsubscribe(); reject(new Error('VtWebGuiFramework i18n/storage did not become ready.')); }, timeoutMs);
    const unsubscribe = store.subscribe(() => {
      if (!ready()) return;
      clearTimeout(timer);
      unsubscribe();
      startFrameworkAppEffects(store);
      resolve(store);
    });
    store.dispatch({ type: 'VIWGF/INIT', payload: { timestamp: Date.now() } });
    if (ready()) { clearTimeout(timer); unsubscribe(); startFrameworkAppEffects(store); resolve(store); }
  });
}
