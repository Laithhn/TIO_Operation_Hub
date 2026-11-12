// Integrates the vendored VtWebGuiFramework 4.0.0-rc.5 (vendor/vt-web-gui-framework) and VtWebGuiIcons
// (vendor/vt-web-gui-icons) into the Vite build. The framework is written for webpack: its src folder sits on the
// module path (components/, assets/, store/, app/, utils/, …), SCSS files are CSS modules with named exports,
// SVG files become React components and process.env values come from DefinePlugin. This plugin reproduces that,
// scoped to the vendored files, so the upstream sources stay unmodified.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, UserConfig } from 'vite';

const webRoot = path.dirname(fileURLToPath(import.meta.url));
export const vtPaths = {
  framework: path.join(webRoot, 'vendor', 'vt-web-gui-framework', 'src'),
  icons: path.join(webRoot, 'vendor', 'vt-web-gui-icons')
};

const norm = (p: string) => p.replace(/\\/g, '/').toLowerCase();
const inVendor = (id?: string) => !!id && norm(id).startsWith(norm(path.join(webRoot, 'vendor')));
const MODULE_ROOTS = new Set(['app', 'assets', 'components', 'desktopApp', 'interfaces', 'store', 'utils']);
const MODULE_QUERY = '?vt.module.scss';
const GLOBAL_SHEETS = /src[\\/]index\.scss$/;

// webpack DefinePlugin values the framework reads (process.env['…']).
const ENV: Record<string, string> = {
  ELEM_ID_ROOT: 'root',
  ELEM_ID_TEMP: 'viTemporaries',
  PROJECTNAME: 'TIO Operations Hub',
  DESCRIPTION: 'TIO Operations Hub',
  VERSION: '',
  OPTIONS: '0',
  PATH_ASSETS: '',
  PATH_CONTENTS: '',
  PATH_USECOMMON: '',
  DESKTOP_APP: '',
  URL_I18N: '/vt-i18n'
};

function svgComponent(svg: string): string {
  const m = svg.match(/<svg\b([^>]*)>([\s\S]*)<\/svg>/i);
  const attrs: Record<string, string> = {};
  for (const a of (m?.[1] ?? '').matchAll(/([\w:-]+)="([^"]*)"/g)) {
    if (a[1].startsWith('xmlns')) continue;
    attrs[a[1].replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = a[2];
  }
  return `import { createElement } from 'react';\nconst attrs = ${JSON.stringify(attrs)};\nconst html = ${JSON.stringify(m?.[2] ?? '')};\n` +
    `export default function Svg(props) { return createElement('svg', { ...attrs, ...props, dangerouslySetInnerHTML: { __html: html } }); }\n`;
}

export function vtFramework(): Plugin {
  return {
    name: 'vt-web-gui-framework',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const opts = { ...options, skipSelf: true };
      const asModule = (r: { id: string } | null) => (r && /\.scss$/.test(r.id) && !GLOBAL_SHEETS.test(r.id) ? { ...r, id: r.id + MODULE_QUERY } : r);
      // The hub reaches the framework through "@vt/…" (and its stylesheets as CSS modules, as the framework does).
      if (source.startsWith('@vt/icons')) return this.resolve(path.join(vtPaths.icons, source.slice('@vt/icons'.length)), importer, opts);
      if (source.startsWith('@vt/')) return asModule(await this.resolve(path.join(vtPaths.framework, source.slice(4)), importer, opts));
      if (!inVendor(importer)) return null;
      const first = source.split('/')[0];
      if (first === 'VtWebGuiIcons') return this.resolve(path.join(vtPaths.icons, source.slice(first.length)), importer, opts);
      if (MODULE_ROOTS.has(first)) return asModule(await this.resolve(path.join(vtPaths.framework, source), importer, opts));
      if (/\.scss$/.test(source)) return asModule(await this.resolve(source, importer, opts));
      return null;
    },
    load(id) {
      if (inVendor(id) && /\.svg$/.test(id)) return svgComponent(fs.readFileSync(id, 'utf8'));
      return null;
    },
    transform(code, id) {
      if (!inVendor(id) || !/\.[jt]sx?$/.test(id.split('?')[0]) || !code.includes('process.env')) return null;
      // Both process.env['X'] (v4 TypeScript) and process.env.X (v3 leftovers such as desktopApp).
      const out = code.replace(/process\.env(?:\[['"](\w+)['"]\]|\.(\w+))/g, (m, a: string | undefined, b: string | undefined) => {
        const k = (a ?? b)!;
        return k === 'NODE_ENV' ? 'process.env.NODE_ENV' : k in ENV ? JSON.stringify(ENV[k]) : 'undefined';
      });
      return { code: out, map: null };
    }
  };
}

/** Vite config fragment: Sass load path (the framework's src, as webpack's resolve.modules), CSS-module naming as in
 * the framework's development build. */
export function vtConfig(): UserConfig {
  return {
    css: {
      modules: {
        generateScopedName: (local: string, file: string) => {
          const clean = file.split('?')[0];
          const hash = createHash('md5').update(norm(clean) + local).digest('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5);
          return `${path.basename(clean, '.scss')}__${local}__${hash}`;
        }
      },
      preprocessorOptions: { scss: { api: 'modern-compiler', loadPaths: [vtPaths.framework], quietDeps: true } as never }
    }
  };
}
