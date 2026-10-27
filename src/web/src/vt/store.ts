// The VtWebGuiFramework 4 Redux store, configured as the framework's own entry (src/index.tsx) does: from a
// configuration element, then waiting until the i18n and storage slices are ready. The hub keeps its own router and
// data layer; the configuration therefore declares only what the framework components read: one language (English,
// the framework's XML table served from /vt-i18n/en.xml) and local storage. Menus, sidebars and footer are rendered
// by the hub (ui/Shell.tsx) and stay unconfigured here.
import { i18nSlice } from '@vt/store/i18n';
import { storageSlice } from '@vt/store/storage';
import { configureReduxStore } from '@vt/store/store';

const CONFIG = `<?xml version="1.0" encoding="UTF-8"?>
<Configuration>
  <Common><HeaderTitle>TIO Operations Hub</HeaderTitle></Common>
  <I18n storageType="local"><Language isDefault="true" format="xml">en</Language></I18n>
</Configuration>`;

export type VtStore = ReturnType<typeof configureReduxStore>;

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
      resolve(store);
    });
    store.dispatch({ type: 'VIWGF/INIT', payload: { timestamp: Date.now() } });
    if (ready()) { clearTimeout(timer); unsubscribe(); resolve(store); }
  });
}
